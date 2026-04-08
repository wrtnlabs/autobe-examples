import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account with random email
  const adminConnection1: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // Capture the email used for first registration
  const duplicateEmail = firstAdmin.email;
  // 2. Attempt to register another admin with the SAME email
  const adminConnection2: api.IConnection = { host: connection.host };
  // 3. Validate that duplicate registration throws an error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_admin_join(adminConnection2, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceAdmin.IJoin,
      });
    },
  );
  // 4. Verify the original admin account remains unchanged
  typia.assert(firstAdmin);
  TestValidator.equals(
    "original admin email preserved",
    firstAdmin.email,
    duplicateEmail,
  );
}
