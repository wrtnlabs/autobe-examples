import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_retrieve_deleted_user_author(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const review = await api.functional.mallPlatform.administrator.reviews.at(
    adminConnection,
    {
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(review);
  TestValidator.predicate(
    "administrator can retrieve a preserved review record",
    review.reviewId.length > 0,
  );
  TestValidator.predicate(
    "review author is represented as deleted user when applicable",
    review.displayState === "deletedUser" ||
      review.displayState === "activeCustomer",
  );
  if (review.displayState === "deletedUser") {
    TestValidator.predicate(
      "deleted user state is preserved for dispute resolution",
      review.customer.id.length > 0,
    );
  }
}
