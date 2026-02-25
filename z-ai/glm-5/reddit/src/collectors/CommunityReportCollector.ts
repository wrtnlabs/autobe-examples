import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityReportCollector {
  export async function collect(props: {
    body: ICommunityReport.ICreate;
    communityMembers: IEntity; // from authorized actor
    communityMemberSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    // Query target content to derive community_id
    let communityId: string;
    if (props.body.content_type === "POST") {
      const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
        where: { id: props.body.content_id },
      });
      communityId = post.community_id;
    } else {
      const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow(
        {
          where: { id: props.body.content_id },
        },
      );
      const post = await MyGlobal.prisma.community_posts.findFirstOrThrow({
        where: { id: comment.community_post_id },
      });
      communityId = post.community_id;
    }
    return {
      id,
      content_type: props.body.content_type,
      content_id: props.body.content_id,
      reason: props.body.reason,
      status: "PENDING",
      created_at: new Date(),
      updated_at: new Date(),
      reporter: { connect: { id: props.communityMembers.id } },
      community: { connect: { id: communityId } },
    } satisfies Prisma.community_reportsCreateInput;
  }
}
