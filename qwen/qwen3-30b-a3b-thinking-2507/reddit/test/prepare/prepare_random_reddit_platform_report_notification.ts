import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReportNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportNotification";
export function prepare_random_reddit_platform_report_notification(
  input?: DeepPartial<IRedditPlatformReportNotification.ICreate>,
): IRedditPlatformReportNotification.ICreate {
  return {
    reportId: typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "resolved",
        "approved",
        "rejected",
      ] as const),
    recipientUserId: typia.random<string & tags.Format<"uuid">>(),
  };
}
