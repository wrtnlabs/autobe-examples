import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_reports_decision(
  input?: DeepPartial<ICommunityPlatformReportsDecision.ICreate>,
): ICommunityPlatformReportsDecision.ICreate {
  return {
    reportId: input?.reportId ?? typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ?? RandomGenerator.pick(["approved", "dismissed"] as const),
    comment: input?.comment !== undefined ? input.comment : null,
  };
}
