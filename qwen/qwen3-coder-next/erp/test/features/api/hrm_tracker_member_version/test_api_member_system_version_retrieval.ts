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

export async function test_api_member_system_version_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Test 1: Successfully retrieve an existing version (assuming system has default version)
  const version = await api.functional.hrmTracker.member.versions.at(
    memberConnection,
    {
      version: "001_initial_schema", // Use a known valid version identifier
    },
  );
  typia.assert(version);
  TestValidator.predicate(
    "version has required properties",
    version.id !== undefined &&
      version.version !== undefined &&
      version.applied_at !== undefined,
  );
  // Test 2: Error on non-existent version (likely returns 404)
  await TestValidator.httpError(
    "should return 404 for non-existent version",
    404,
    async () => {
      await api.functional.hrmTracker.member.versions.at(memberConnection, {
        version: "non_existent_version_" + Math.random(),
      });
    },
  );
  // Test 3: Unauthenticated access should be rejected with 401
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should reject unauthenticated access",
    401,
    async () => {
      await api.functional.hrmTracker.member.versions.at(guestConnection, {
        version: "001_initial_schema",
      });
    },
  );
}
