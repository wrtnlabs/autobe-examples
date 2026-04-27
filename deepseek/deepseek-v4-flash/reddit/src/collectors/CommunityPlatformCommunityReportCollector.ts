import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityReportCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityReport.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Resolve the community from the target content
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
        });
      const post =
        await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
          where: { id: comment.community_platform_post_id },
        });
      communityId = post.community_id;
    }
    return {
      id,
      target_type: props.body.targetType,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: communityId } },
      reporter: { connect: { id: props.communityPlatformMembers.id } },
      targetPost:
        props.body.targetType === "post"
          ? { connect: { id: props.body.targetId } }
          : undefined,
      targetComment:
        props.body.targetType === "comment"
          ? { connect: { id: props.body.targetId } }
          : undefined,
    } satisfies Prisma.community_platform_community_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformCommunityReportCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformCommunityReport.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       target_type: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       community: ...,
//       reporter: ...,
//       targetPost: ...,
//       targetComment: ...,
//           } satisfies Prisma.community_platform_community_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------