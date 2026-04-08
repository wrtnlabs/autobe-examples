import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformReportCollector {
  export async function collect(props: {
    body: IRedditPlatformReport.ICreate;
    redditPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Query target content to get community_id (indirect reference pattern)
    const communityId = await (async () => {
      if (props.body.target_type === "post") {
        const post =
          await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow({
            where: { id: props.body.target_id },
            select: { community_id: true },
          });
        return post.community_id;
      }
      const comment =
        await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
          where: { id: props.body.target_id },
          select: { reddit_platform_post_id: true },
        });
      const post = await MyGlobal.prisma.reddit_platform_posts.findFirstOrThrow(
        {
          where: { id: comment.reddit_platform_post_id },
          select: { community_id: true },
        },
      );
      return post.community_id;
    })();
    return {
      id,
      reportedBy: { connect: { id: props.redditPlatformMemberSessions.id } },
      community: { connect: { id: communityId } },
      reviewedBy: undefined,
      created_at: new Date(),
      reason: props.body.reason,
      updated_at: new Date(),
      deleted_at: null,
      target_type: props.body.target_type,
      target_id: props.body.target_id as unknown as number,
      reviewed_at: null,
      status: "pending",
    } satisfies Prisma.reddit_platform_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformReportCollector {
//         export async function collect(props: {
//           body: IRedditPlatformReport.ICreate;
//           redditPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       reason: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       target_type: ...,
//       target_id: ...,
//       reviewed_at: ...,
//       status: ...,
//       reportedBy: ...,
//       community: ...,
//       reviewedBy: ...,
//           } satisfies Prisma.reddit_platform_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------