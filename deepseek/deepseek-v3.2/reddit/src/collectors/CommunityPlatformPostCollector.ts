import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { CommunityPlatformPostAttachmentCollector } from "./CommunityPlatformPostAttachmentCollector";
import { CommunityPlatformPostLinkCollector } from "./CommunityPlatformPostLinkCollector";
import { CommunityPlatformPostTextCollector } from "./CommunityPlatformPostTextCollector";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    author: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    // Look up community by name to get ID for connect
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
        where: { name: props.body.community_name },
      });
    return {
      // Scalar fields
      id,
      title: props.body.title,
      content_type: props.body.content_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.author.id } },
      community: { connect: { id: community.id } },
      // Content type conditional creates
      linkContent:
        props.body.content_type === "LINK" && props.body.content_link
          ? {
              create: await CommunityPlatformPostLinkCollector.collect({
                body: props.body.content_link,
                post: { id }, // Added missing 'post' parameter
              }),
            }
          : undefined,
      textContent:
        props.body.content_type === "TEXT" && props.body.content_text
          ? {
              create: await CommunityPlatformPostTextCollector.collect({
                body: props.body.content_text,
                post: { id }, // Added missing 'post' parameter
              }),
            }
          : undefined,
      attachments:
        props.body.content_type === "IMAGE" && props.body.content_attachment
          ? {
              create: [
                await CommunityPlatformPostAttachmentCollector.collect({
                  body: props.body.content_attachment,
                  post: { id },
                  member: props.author, // Changed 'author' to 'member' as expected
                  session: props.session,
                }),
              ],
            }
          : undefined,
      // Other hasMany relations (not applicable for initial creation)
      snapshots: undefined,
      viewStats: undefined,
      comments: undefined,
      postVotes: undefined,
      voteSnapshots: undefined,
      reports: undefined,
      postReports: undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
