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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_review_forbidden_for_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const administratorRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(administratorRequest);
  const originalApplicantType = administratorRequest.applicant_type;
  TestValidator.equals(
    "administrator request starts pending",
    administratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "administrator request review note starts null",
    administratorRequest.review_note,
    null,
  );
  TestValidator.equals(
    "administrator request rejection reason starts null",
    administratorRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "administrator request reviewed_at starts null",
    administratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "administrator request approved_at starts null",
    administratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "administrator request rejected_at starts null",
    administratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "administrator request reviewer starts null",
    administratorRequest.reviewedByAdministrator,
    null,
  );
  const regularAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const regularAdministrator = await authorize_administrator_join(
    regularAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdministrator);
  const reviewBody = {
    status: "approved",
    reviewNote: RandomGenerator.paragraph({ sentences: 2 }),
    rejectionReason: null,
  } satisfies IShoppingMallAdministratorRequest.IUpdate;
  await TestValidator.error(
    "regular administrator cannot review administrator request",
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.update(
        regularAdministratorConnection,
        {
          administratorRequestId: administratorRequest.id,
          body: reviewBody,
        },
      );
    },
  );
  TestValidator.equals(
    "request status remains pending in captured state",
    administratorRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request review note remains null in captured state",
    administratorRequest.review_note,
    null,
  );
  TestValidator.equals(
    "request rejection reason remains null in captured state",
    administratorRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "request reviewed_at remains null in captured state",
    administratorRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "request approved_at remains null in captured state",
    administratorRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "request rejected_at remains null in captured state",
    administratorRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "request reviewer remains null in captured state",
    administratorRequest.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "request applicant type remains unchanged in captured state",
    administratorRequest.applicant_type,
    originalApplicantType,
  );
}
