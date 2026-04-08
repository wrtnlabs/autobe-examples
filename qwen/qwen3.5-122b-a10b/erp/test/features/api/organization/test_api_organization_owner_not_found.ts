import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent organization owner record returns a 404 error.
 *
 * Validates proper error handling when attempting to access organization owner records that do not exist in the system. This test ensures the API correctly rejects requests with invalid owner references and returns appropriate HTTP error responses.
 *
 * The test flow registers a new member account, then attempts to retrieve an owner record using randomly generated UUIDs that do not correspond to any existing organization or owner. The endpoint should return a 404 Not Found error, confirming proper error handling for non-existent resources.
 *
 * 1. Register a new member account with random credentials.
 * 2. Generate random UUIDs for organizationId and ownerId that do not exist.
 * 3. Attempt to retrieve the owner record using the invalid IDs.
 * 4. Validate that a 404 HttpError is thrown.
 */
export async function test_api_organization_owner_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate random non-existent UUIDs for organization and owner
  const fakeOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fakeOwnerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the owner record and validate 404 error
  await TestValidator.httpError(
    "non-existent owner should return 404",
    404,
    async () => {
      await api.functional.hrm.member.organizations.owners.at(
        memberConnection,
        {
          organizationId: fakeOrganizationId,
          ownerId: fakeOwnerId,
        },
      );
    },
  );
}
