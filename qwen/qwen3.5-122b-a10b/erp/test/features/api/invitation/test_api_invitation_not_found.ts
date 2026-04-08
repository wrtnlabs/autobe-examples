import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent invitation returns 404 Not Found error.
 *
 * Validates that the invitation retrieval endpoint properly handles requests for
 * invitations that do not exist in the database. The test authenticates a member
 * account, generates a valid UUID that doesn't correspond to any invitation, and
 * verifies the system returns a 404 error rather than a permission error or
 * successful response.
 *
 * 1. Register and authenticate a new member account with random credentials.
 * 2. Generate a valid UUID format that does not exist in the invitations table.
 * 3. Attempt to retrieve the invitation using the at() API function.
 * 4. Validate that an HttpError is thrown with status code 404.
 */
export async function test_api_invitation_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate a valid UUID that doesn't exist in the database
  const nonExistentInvitationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent invitation
  // 4. Validate that HttpError with 404 status is thrown
  await TestValidator.httpError(
    "invitation not found returns 404",
    404,
    async () => {
      await api.functional.hrm.member.invitations.at(memberConnection, {
        invitationId: nonExistentInvitationId,
      });
    },
  );
}
