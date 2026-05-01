import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubReportCollector {
  export async function collect(props: {
    body: ICommunityHubReport.ICreate;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    const communityId = await (async () => {
      if (props.body.target_type === "post") {
        const post = await MyGlobal.prisma.community_hub_posts.findFirstOrThrow(
          {
            where: { id: props.body.target_id },
          },
        );
        return post.community_hub_community_id;
      }
      // target_type === "comment"
      const comment =
        await MyGlobal.prisma.community_hub_comments.findFirstOrThrow({
          where: { id: props.body.target_id },
        });
      const post = await MyGlobal.prisma.community_hub_posts.findFirstOrThrow({
        where: { id: comment.community_hub_post_id },
      });
      return post.community_hub_community_id;
    })();
    return {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter: { connect: { id: props.communityHubMembers.id } },
      community: { connect: { id: communityId } },
    } satisfies Prisma.community_hub_reportsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubReportCollector {
//         export async function collect(props: {
//           body: ICommunityHubReport.ICreate;
//           communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       target_type: ...,
//       target_id: ...,
//       reason: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       reporter: ...,
//       community: ...,
//           } satisfies Prisma.community_hub_reportsCreateInput;
//         }
//       }
//--------------------------------------------------------------