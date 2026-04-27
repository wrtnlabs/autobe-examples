import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformReport.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Resolve community from target content
    let communityId: string;
    if (props.body.targetType === "post") {
      const post =
        await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
          where: { id: props.body.targetId },
        });
      communityId = post.community_id;
    } else {
      const comment =
        await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
          where: { id: props.body.targetId },
          include: { post: { select: { community_id: true } } },
        });
      communityId = comment.post.community_id;
    }
    return {
      id,
      reason: props.body.reason,
      target_type: props.body.targetType,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: communityId } },
      reportPostTarget:
        props.body.targetType === "post"
          ? {
              create: {
                id: v4(),
                post: { connect: { id: props.body.targetId } },
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      commentTarget:
        props.body.targetType === "comment"
          ? {
              create: {
                id: v4(),
                comment: { connect: { id: props.body.targetId } },
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformReportCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformReport.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       reason: ...,
//       target_type: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       reporter: ...,
//       community: ...,
//       reportPostTarget: ...,
//       commentTarget: ...,
//           } satisfies Prisma.community_platform_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------