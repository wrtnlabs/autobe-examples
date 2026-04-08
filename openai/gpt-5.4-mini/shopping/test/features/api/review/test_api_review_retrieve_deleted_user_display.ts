import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_retrieve_deleted_user_display(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      href: "/",
      referrer: "",
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "unauthenticated review retrieval should be rejected with an invalid review identifier",
    [401, 404],
    async () => {
      await api.functional.mallPlatform.customer.reviews.at(connection, {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  await TestValidator.httpError(
    "authenticated review retrieval should reject a missing review identifier",
    404,
    async () => {
      await api.functional.mallPlatform.customer.reviews.at(
        customerConnection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
