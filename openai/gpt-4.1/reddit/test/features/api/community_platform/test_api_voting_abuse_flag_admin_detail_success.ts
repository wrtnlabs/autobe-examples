import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformVotingAbuseFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAbuseFlag";

export async function test_api_voting_abuse_flag_admin_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Prepare a random UUID for votingAbuseFlagId (test uses random until flag creation API exists)
  const votingAbuseFlagId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve voting abuse flag detail
  const result: ICommunityPlatformVotingAbuseFlag =
    await api.functional.communityPlatform.administrator.votingAbuseFlags.at(
      connection,
      {
        votingAbuseFlagId,
      },
    );
  typia.assert(result);

  // Step 4: Validate id, structure, and critical business fields
  TestValidator.equals(
    "returned votingAbuseFlagId matches requested id",
    result.id,
    votingAbuseFlagId,
  );
  TestValidator.predicate(
    "violation_type is present",
    typeof result.violation_type === "string" && !!result.violation_type,
  );
  TestValidator.predicate(
    "status is present",
    typeof result.status === "string" && !!result.status,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
}
