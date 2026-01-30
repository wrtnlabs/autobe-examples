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
export async function test_api_member_karma_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies ICommunityBbsMember.IJoin;
  const authenticatedMember = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authenticatedMember);
  // Call the karma summary endpoint with authenticated connection
  const karmaSummary =
    await api.functional.communityBbs.member.karma.at(memberConnection);
  typia.assert(karmaSummary);
  // Validate business logic: currentScore must be non-negative (guaranteed by schema, but verify logic)
  TestValidator.predicate(
    "currentScore is non-negative",
    karmaSummary.currentScore >= 0,
  );
  // Validate decayStatus is one of the valid enum values
  TestValidator.predicate(
    "decayStatus is valid",
    ["active", "declining", "stagnant"].includes(karmaSummary.decayStatus),
  );
  // Validate pendingPenalties is either null or non-negative
  TestValidator.predicate(
    "pendingPenalties is null or non-negative",
    karmaSummary.pendingPenalties === null ||
      karmaSummary.pendingPenalties >= 0,
  );
}
