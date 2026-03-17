import { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformReportReviewCollector {
  export async function collect(props: {
    body: ICommunityPlatformReportReview.ICreate;
    report: IEntity;
    moderator: IEntity;
  }) {
    return {
      id: v4(),
      review_action: props.body.review_action,
      note: props.body.note ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      report: {
        connect: {
          id: props.report.id,
        },
      },
      moderator: {
        connect: {
          id: props.moderator.id,
        },
      },
    } satisfies Prisma.community_platform_report_reviewsCreateInput;
  }
}
