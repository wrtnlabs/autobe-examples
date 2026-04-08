import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_account_retrieve_with_profile(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: `${RandomGenerator.alphaNumeric(12)}!` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.mallPlatform.administrator.customers.at(
    adminConnection,
    {
      customerId,
    },
  );
  typia.assert(output);
  TestValidator.predicate("customer id is uuid-like", output.id.length > 0);
  TestValidator.predicate("customer email is present", output.email.length > 0);
  TestValidator.predicate(
    "customer status is present",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "customer created_at is present",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "customer updated_at is present",
    output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "customer deleted_at is nullable date-time or null",
    output.deleted_at === null || output.deleted_at.length > 0,
  );
  if (output.profile !== undefined) {
    TestValidator.predicate(
      "profile id is present",
      output.profile.id.length > 0,
    );
    TestValidator.predicate(
      "profile display name is present",
      output.profile.displayName.length > 0,
    );
    TestValidator.predicate(
      "profile phone number is present",
      output.profile.phoneNumber.length > 0,
    );
    TestValidator.predicate(
      "profile customer id is present",
      output.profile.customer.id.length > 0,
    );
    TestValidator.predicate(
      "profile customer email is present",
      output.profile.customer.email.length > 0,
    );
    TestValidator.predicate(
      "profile customer status is present",
      output.profile.customer.status.length > 0,
    );
    TestValidator.predicate(
      "profile createdAt is present",
      output.profile.createdAt.length > 0,
    );
    TestValidator.predicate(
      "profile updatedAt is present",
      output.profile.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "profile deletedAt is nullable date-time or null",
      output.profile.deletedAt === null || output.profile.deletedAt.length > 0,
    );
  }
}
