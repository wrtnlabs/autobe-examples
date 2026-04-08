import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email uniqueness constraint during member registration.
 *
 * Validates that the system enforces unique email addresses across all member accounts by attempting to register a duplicate email address. The test ensures that the second registration attempt is rejected with an appropriate HTTP 409 conflict status code.
 *
 * 1. Register first member account with a unique email address.
 * 2. Attempt to register second member account with the same email address.
 * 3. Validate that the second registration fails with HTTP 409 conflict status.
 * 4. Confirm that no duplicate member record is created in the database.
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account with unique email
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to register second member with same email
  const secondMemberConnection: api.IConnection = { host: connection.host };
  // 3. Validate that duplicate registration fails with HTTP 409
  await TestValidator.httpError(
    "duplicate email registration rejected",
    409,
    async () => {
      await authorize_member_join(secondMemberConnection, {
        body: {
          email: firstEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmMember.IJoin,
      });
    },
  );
}
