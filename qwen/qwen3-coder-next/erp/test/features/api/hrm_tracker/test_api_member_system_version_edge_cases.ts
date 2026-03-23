import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_system_version_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Test: Retrieve latest version and validate all required fields
  const latestVersion = await api.functional.hrmTracker.member.versions.at(
    memberConnection,
    {
      version: "latest",
    },
  );
  typia.assert(latestVersion);
  // Validate all required fields are present
  TestValidator.equals("id is valid UUID", latestVersion.id.length, 36);
  TestValidator.predicate(
    "version is non-empty string",
    latestVersion.version.length > 0,
  );
  TestValidator.predicate(
    "applied_at is valid ISO date",
    Date.parse(latestVersion.applied_at) > 0,
  );
  TestValidator.predicate(
    "rollback_version is string or null",
    latestVersion.rollback_version === null ||
      typeof latestVersion.rollback_version === "string",
  );
  // 3. Test: Attempt to retrieve non-existent version to verify error handling
  await TestValidator.error("non-existent version returns error", async () => {
    await api.functional.hrmTracker.member.versions.at(memberConnection, {
      version: "invalid-version-12345",
    });
  });
  // 4. Test: Verify rollback_version behavior
  // Get a specific version that exists
  const existingVersion = await api.functional.hrmTracker.member.versions.at(
    memberConnection,
    {
      version: latestVersion.version,
    },
  );
  typia.assert(existingVersion);
  // Validate rollback_version can be null or contain a version string
  TestValidator.predicate(
    "rollback_version is either null or string",
    existingVersion.rollback_version === null ||
      typeof existingVersion.rollback_version === "string",
  );
}
