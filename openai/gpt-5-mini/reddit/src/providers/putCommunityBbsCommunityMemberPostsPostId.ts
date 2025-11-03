import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberPostsPostId(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsPost.IUpdate;
}): Promise<ICommunityBbsPost> {
  const { communityMember, postId, body } = props;

  // 1) Load existing post
  const post = await MyGlobal.prisma.community_bbs_posts.findUniqueOrThrow({
    where: { id: postId },
  });

  // 2) Not found if soft-deleted
  if (post.deleted_at !== null) throw new HttpException("Not Found", 404);

  // 3) Authorization: author or active moderator of the community
  const isAuthor = post.community_bbs_communitymember_id === communityMember.id;
  let isModerator = false;
  if (!isAuthor) {
    const mod =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: post.community_bbs_community_id,
          community_member_id: communityMember.id,
          active: true,
        },
      });
    isModerator = !!mod;
    if (!isModerator)
      throw new HttpException(
        "Unauthorized: Only the author or a moderator may update this post",
        403,
      );
  }

  // 4) Enforce community publish rules
  const communitySettings =
    await MyGlobal.prisma.community_bbs_community_settings.findUnique({
      where: { community_id: post.community_bbs_community_id },
    });

  if (
    body.is_published === true &&
    communitySettings?.require_post_approval === true &&
    !isModerator
  ) {
    throw new HttpException(
      "Forbidden: Community requires approval to publish posts",
      403,
    );
  }

  // 5) Decide whether to snapshot prior to update (significant change)
  const significantFields: Array<keyof ICommunityBbsPost.IUpdate> = [
    "title",
    "body",
    "post_type",
    "link_url",
    "business_status",
    "is_published",
    "published_at",
  ];

  const willChange = significantFields.some(
    (k) =>
      Object.prototype.hasOwnProperty.call(body, k) &&
      (body as any)[k] !== (post as any)[k],
  );

  if (willChange) {
    const snapshotId = v4() satisfies string & tags.Format<"uuid">;
    await MyGlobal.prisma.community_bbs_post_snapshots.create({
      data: {
        id: snapshotId,
        community_bbs_post_id: post.id,
        community_bbs_communitymember_id: post.community_bbs_communitymember_id,
        title: post.title,
        body: post.body,
        post_type: post.post_type,
        link_url: post.link_url,
        score: post.score,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        comment_count: post.comment_count,
        snapshot_at: toISOStringSafe(new Date()),
      },
    });
  }

  // 6) Prepare audit payload (only include provided fields)
  const changes: Record<string, unknown> = {};
  for (const key of significantFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      // runtime extract is safe; DTO validated at controller
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changes[String(key)] = (body as any)[key];
    }
  }

  const auditId = v4() satisfies string & tags.Format<"uuid">;
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: auditId,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "post",
      action: "edited",
      payload: JSON.stringify({ postId: post.id, changes }),
      ip: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 7) Apply update (inline data object - undefined to skip, null to clear)
  const updated = await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: Object.prototype.hasOwnProperty.call(body, "body")
        ? body.body
        : undefined,
      post_type: body.post_type ?? undefined,
      link_url: Object.prototype.hasOwnProperty.call(body, "link_url")
        ? body.link_url
        : undefined,
      business_status: body.business_status ?? undefined,
      is_published: body.is_published ?? undefined,
      published_at: Object.prototype.hasOwnProperty.call(body, "published_at")
        ? body.published_at === null
          ? null
          : toISOStringSafe(body.published_at as any)
        : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 8) Compose author summary
  const authorRow =
    await MyGlobal.prisma.community_bbs_communitymember.findUniqueOrThrow({
      where: { id: updated.community_bbs_communitymember_id },
    });

  const authorSummary: ICommunityBbsCommunityMember.ISummary = {
    id: authorRow.id,
    username: authorRow.username,
    display_name:
      authorRow.display_name === null
        ? null
        : (authorRow.display_name ?? undefined),
    karma: authorRow.karma,
    created_at: toISOStringSafe(authorRow.created_at),
    updated_at: toISOStringSafe(authorRow.updated_at),
  };

  // 9) Compose community summary
  const communityRow =
    await MyGlobal.prisma.community_bbs_communities.findUniqueOrThrow({
      where: { id: updated.community_bbs_community_id },
    });

  const communitySummary: ICommunityBbsCommunity.ISummary = {
    id: communityRow.id,
    name: communityRow.name,
    slug: communityRow.slug,
    description:
      communityRow.description === null
        ? null
        : (communityRow.description ?? undefined),
    creator: {
      id: communityRow.creator_id,
      username: "",
      display_name: undefined,
      karma: 0,
      created_at: toISOStringSafe(communityRow.created_at),
      updated_at: toISOStringSafe(communityRow.updated_at),
    } as unknown as ICommunityBbsCommunityMember.ISummary,
    visibility: communityRow.visibility as "public" | "restricted" | "private",
    post_approval_required: communityRow.post_approval_required,
    members_count: communityRow.members_count,
    posts_count: communityRow.posts_count,
    community_settings: undefined,
    created_at: toISOStringSafe(communityRow.created_at),
    updated_at: toISOStringSafe(communityRow.updated_at),
    deleted_at: null,
  };

  // 10) Load media list
  const mediaRows = await MyGlobal.prisma.community_bbs_post_media.findMany({
    where: { community_bbs_post_id: updated.id },
    orderBy: { ordering: "asc" },
  });

  const media: ICommunityBbsPostMedia[] | undefined = mediaRows.length
    ? mediaRows.map((m) => ({
        id: m.id,
        post_id: m.community_bbs_post_id,
        post: undefined,
        url: m.url,
        media_type: m.media_type,
        ordering: m.ordering,
        size_bytes: m.size_bytes,
        is_moderated: m.is_moderated,
        moderation_status: m.moderation_status as
          | "pending"
          | "approved"
          | "rejected",
        moderated_at: m.moderated_at ? toISOStringSafe(m.moderated_at) : null,
        moderated_by: undefined,
        created_at: toISOStringSafe(m.created_at),
      }))
    : undefined;

  // 11) Final assembled DTO
  const result: ICommunityBbsPost = {
    id: updated.id,
    community_bbs_community_id: updated.community_bbs_community_id,
    community_bbs_communitymember_id: updated.community_bbs_communitymember_id,
    title: updated.title,
    body: updated.body === null ? null : (updated.body ?? undefined),
    post_type: typia.assert<"link" | "text" | "image">(updated.post_type),
    link_url:
      updated.link_url === null ? null : (updated.link_url ?? undefined),
    score: updated.score,
    upvotes: updated.upvotes,
    downvotes: updated.downvotes,
    comment_count: updated.comment_count,
    is_published: updated.is_published,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : null,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    author: authorSummary,
    community: communitySummary,
    media,
  };

  return result;
}
