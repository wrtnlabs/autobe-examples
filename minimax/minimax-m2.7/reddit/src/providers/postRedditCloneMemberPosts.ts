import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostLinkTransformer } from "../transformers/RedditClonePostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePostLink.ICreate;
}): Promise<IRedditClonePostLink> {
  // Step 1: Look up community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.body.communityName },
    select: { id: true, name: true },
  });
  if (!community) {
    throw new HttpException(
      `Community '${props.body.communityName}' not found`,
      404,
    );
  }
  // Step 2: Check if member is subscribed to the community
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: community.id,
      },
      select: { id: true },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to this community to create a post",
      403,
    );
  }
  // Step 3: Check if member is banned from the community
  const existingBan =
    await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: community.id,
      },
      select: { id: true },
    });
  if (existingBan) {
    throw new HttpException(
      "You are banned from this community and cannot create posts",
      403,
    );
  }
  // Step 4: Extract content based on type discriminator
  // Accessing additional fields that exist on the actual request body
  const bodyAny = props.body as IRedditClonePostLink.ICreate &
    Record<string, unknown>;
  const textBody = bodyAny.body as string | undefined;
  const linkUrl = bodyAny.url as string | undefined;
  const fileId = bodyAny.fileId as string | undefined;
  // Build post data with proper content based on type
  const postData: Prisma.reddit_clone_postsCreateInput = {
    id: v4(),
    title: props.body.title,
    type: props.body.type,
    vote_score: 0,
    comment_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    author: { connect: { id: props.member.id } },
    community: { connect: { id: community.id } },
  };
  // Add type-specific content
  if (props.body.type === "text") {
    postData.postTextContent = {
      create: {
        id: v4(),
        body: textBody ?? "",
      },
    };
  } else if (props.body.type === "link") {
    postData.link = {
      create: {
        id: v4(),
        url: linkUrl ?? "",
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
  } else if (props.body.type === "image") {
    postData.image = {
      create: {
        id: v4(),
        reddit_clone_file_id: fileId ?? "",
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
  }
  // Step 5: Create post with nested content
  const createdPost = await MyGlobal.prisma.reddit_clone_posts.create({
    data: postData,
    ...RedditClonePostLinkTransformer.select(),
  });
  // Step 6: Return transformed response
  return await RedditClonePostLinkTransformer.transform(createdPost);
}
