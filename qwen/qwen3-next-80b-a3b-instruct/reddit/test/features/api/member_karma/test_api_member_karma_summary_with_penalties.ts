import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_karma_summary_with_penalties(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // Retrieve karma summary for the authenticated member
  const karmaSummary =
    await api.functional.communityBbs.member.karma.at(memberConnection);
  typia.assert(karmaSummary);
  // Validate the structure of karma summary
  TestValidator.equals(
    "pendingPenalties is a number or null",
    typeof karmaSummary.pendingPenalties === "number" ||
      karmaSummary.pendingPenalties === null,
    true,
  );
  TestValidator.predicate(
    "currentScore is non-negative",
    karmaSummary.currentScore >= 0,
  );
  TestValidator.equals(
    "decayStatus has a valid value",
    karmaSummary.decayStatus,
    "active" as const,
  );
  TestValidator.equals(
    "decayStatus has another valid value",
    karmaSummary.decayStatus,
    "declining" as const,
  );
  TestValidator.equals(
    "decayStatus has another valid value",
    karmaSummary.decayStatus,
    "stagnant" as const,
  );
  TestValidator.predicate(
    "lastUpdated is a valid ISO date-time string",
    new Date(karmaSummary.lastUpdated).toString() !== "Invalid Date",
  );
}
