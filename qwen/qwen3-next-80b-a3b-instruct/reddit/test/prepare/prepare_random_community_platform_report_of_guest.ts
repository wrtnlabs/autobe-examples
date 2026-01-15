import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfGuest";
export function prepare_random_community_platform_report_of_guest(
  input?: DeepPartial<ICommunityPlatformReportOfGuest.ICreate>,
): ICommunityPlatformReportOfGuest.ICreate {
  return {
    guest_session_id:
      input?.guest_session_id ?? typia.random<string & tags.Format<"uuid">>(),
    report_reason:
      input?.report_reason ??
      RandomGenerator.pick([
        "spam",
        "inappropriate_content",
        "harassment",
        "fraud",
        "other",
      ] as const),
  };
}
