import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_snapshot_history_owner_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformReviewSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
    search: RandomGenerator.alphabets(6),
    snapshotAction: RandomGenerator.alphabets(5),
    isDeleted: false,
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("requested page returned", output.pagination.current, 1);
  TestValidator.equals("requested limit returned", output.pagination.limit, 10);
  TestValidator.predicate(
    "records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", output.pagination.pages >= 0);
  TestValidator.predicate(
    "snapshot rows are tied to the requested review",
    output.data.every((row) => row.review.id === reviewId),
  );
  TestValidator.predicate(
    "snapshot rows preserve the authenticated customer reference when present",
    output.data.every((row) => row.customer.id === customer.id),
  );
  TestValidator.predicate(
    "snapshot rows are ordered by createdAt descending when requested",
    output.data.every(
      (row, index, array) =>
        index === 0 || array[index - 1]!.createdAt >= row.createdAt,
    ),
  );
  TestValidator.predicate(
    "snapshot rows expose preserved immutable fields",
    output.data.every(
      (row) =>
        typeof row.snapshotAction === "string" &&
        typeof row.rating === "number" &&
        typeof row.createdAt === "string" &&
        typeof row.isDeleted === "boolean" &&
        row.review.id.length > 0 &&
        row.customer.id.length > 0,
    ),
  );
}
