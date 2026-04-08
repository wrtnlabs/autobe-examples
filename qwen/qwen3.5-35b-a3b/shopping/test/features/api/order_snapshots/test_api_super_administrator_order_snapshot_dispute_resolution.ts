import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_order_snapshot_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse =
    await api.functional.ecommerceMall.auth.super_administrator.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          display_name: RandomGenerator.name(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallSuperAdministrator.IJoin,
      },
    );
  typia.assert(superAdminResponse);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminResponse.token.access}`,
  };
  // 2. Register member customer
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await api.functional.ecommerceMall.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(memberResponse);
  memberConnection.headers = {
    Authorization: `Bearer ${memberResponse.token.access}`,
  };
  // 3. Login member for subsequent operations
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginResponse =
    await api.functional.ecommerceMall.auth.member.login(
      memberLoginConnection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallMember.ILogin,
      },
    );
  typia.assert(memberLoginResponse);
  memberLoginConnection.headers = {
    Authorization: `Bearer ${memberLoginResponse.token.access}`,
  };
  // 4. Test snapshot retrieval with random UUID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.order_snapshots.at(
      superAdminConnection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot has valid UUID fields
  TestValidator.equals("snapshot id is valid UUID", snapshot.id, snapshotId);
  TestValidator.predicate(
    "order_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(snapshot.order_id),
  );
  TestValidator.predicate(
    "product_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(snapshot.product_id),
  );
  TestValidator.predicate(
    "product_variant_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(snapshot.product_variant_id),
  );
  TestValidator.predicate(
    "seller_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(snapshot.seller_id),
  );
  // 6. Validate snapshot contains denormalized string data
  TestValidator.equals(
    "snapshot has product name string",
    typeof snapshot.product_name,
    "string",
  );
  TestValidator.predicate(
    "product name is not empty",
    snapshot.product_name.length > 0,
  );
  TestValidator.equals(
    "snapshot has seller name string",
    typeof snapshot.seller_name,
    "string",
  );
  TestValidator.predicate(
    "seller name is not empty",
    snapshot.seller_name.length > 0,
  );
  TestValidator.equals(
    "snapshot has variant options string",
    typeof snapshot.product_variant_options,
    "string",
  );
  // 7. Validate quantity is positive integer
  TestValidator.equals(
    "quantity is number",
    typeof snapshot.quantity,
    "number",
  );
  TestValidator.predicate("quantity is positive", snapshot.quantity > 0);
  TestValidator.predicate(
    "quantity is integer",
    Number.isInteger(snapshot.quantity),
  );
  // 8. Validate pricing
  TestValidator.equals(
    "unit_price is number",
    typeof snapshot.unit_price,
    "number",
  );
  TestValidator.predicate("unit_price is positive", snapshot.unit_price > 0);
  TestValidator.equals(
    "total_price is number",
    typeof snapshot.total_price,
    "number",
  );
  TestValidator.predicate("total_price is positive", snapshot.total_price > 0);
  // 9. Validate total price calculation matches quantity * unit_price
  const expectedTotal = snapshot.quantity * snapshot.unit_price;
  TestValidator.equals(
    "total equals quantity * unit_price",
    snapshot.total_price,
    expectedTotal,
  );
  // 10. Validate snapshot_type is one of the valid values
  TestValidator.predicate(
    "snapshot_type is checkout, cancellation, or refund",
    ["checkout", "cancellation", "refund"].includes(snapshot.snapshot_type),
  );
  // 11. Validate created_at timestamp
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(snapshot.created_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
  );
}