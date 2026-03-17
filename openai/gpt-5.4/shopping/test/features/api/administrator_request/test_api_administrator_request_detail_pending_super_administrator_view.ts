import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_detail_pending_super_administrator_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const reason = RandomGenerator.paragraph({ sentences: 6 });
  const created =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(created);
  const found =
    await api.functional.shoppingMall.customer.administrator_requests.at(
      customerConnection,
      {
        administratorRequestId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "request id matches created record",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "applicant type preserved",
    found.applicant_type,
    created.applicant_type,
  );
  TestValidator.equals(
    "new request remains pending",
    found.status,
    created.status,
  );
  TestValidator.equals("reason preserved", found.reason, reason);
  TestValidator.equals("review note remains null", found.review_note, null);
  TestValidator.equals(
    "rejection reason remains null",
    found.rejection_reason,
    null,
  );
  TestValidator.equals("reviewed at remains null", found.reviewed_at, null);
  TestValidator.equals("approved at remains null", found.approved_at, null);
  TestValidator.equals("rejected at remains null", found.rejected_at, null);
  TestValidator.equals(
    "reviewer remains unassigned",
    found.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "created timestamp is unchanged by read",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp is unchanged by read",
    found.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp is unchanged by read",
    found.deleted_at,
    created.deleted_at,
  );
}
