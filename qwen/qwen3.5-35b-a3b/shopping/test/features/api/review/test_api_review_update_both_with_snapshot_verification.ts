import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_update_both_with_snapshot_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for review ownership
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customer);
  // Create customer connection for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { ...customerConnection.headers },
  };
  // 2. First update: rating 2 → 4, text changed
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const firstUpdateBody = {
    rating: 4,
    review_text:
      "After using for a month, I changed my mind. Product quality improved with usage. Good value for price.",
  } satisfies IEcommerceMallReview.IUpdate;
  const firstUpdate = await api.functional.ecommerceMall.member.reviews.update(
    authenticatedConnection,
    {
      reviewId,
      body: firstUpdateBody,
    },
  );
  typia.assert(firstUpdate);
  // 3. Verify first update response
  TestValidator.equals("first update rating", firstUpdate.rating, 4);
  TestValidator.equals(
    "first update text",
    firstUpdate.review_text,
    firstUpdateBody.review_text,
  );
  const firstUpdatedAt = firstUpdate.updated_at;
  TestValidator.predicate(
    "first update has valid timestamp",
    firstUpdatedAt !== undefined,
  );
  // Wait a moment to ensure updated_at changes
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Second update: rating 4 → 5, different text
  const secondUpdateBody = {
    rating: 5,
    review_text:
      "Excellent product! Would definitely recommend to others. Five stars!",
  } satisfies IEcommerceMallReview.IUpdate;
  const secondUpdate = await api.functional.ecommerceMall.member.reviews.update(
    authenticatedConnection,
    {
      reviewId,
      body: secondUpdateBody,
    },
  );
  typia.assert(secondUpdate);
  // 5. Verify second update response
  TestValidator.equals("second update rating", secondUpdate.rating, 5);
  TestValidator.equals(
    "second update text",
    secondUpdate.review_text,
    secondUpdateBody.review_text,
  );
  const secondUpdatedAt = secondUpdate.updated_at;
  // 6. Verify timestamps are different (updated_at refreshed)
  TestValidator.notEquals(
    "updated_at refreshed on second update",
    firstUpdatedAt,
    secondUpdatedAt,
  );
  // 7. Verify review structure completeness
  TestValidator.predicate("review has id", firstUpdate.id !== undefined);
  TestValidator.predicate(
    "review has member reference",
    firstUpdate.member !== undefined,
  );
  TestValidator.predicate(
    "review has product reference",
    firstUpdate.product !== undefined,
  );
  TestValidator.predicate(
    "review has orderItem reference",
    firstUpdate.orderItem !== undefined,
  );
  TestValidator.predicate(
    "review has created_at",
    firstUpdate.created_at !== undefined,
  );
  TestValidator.predicate(
    "review is not deleted",
    firstUpdate.deleted_at === null,
  );
  // 8. Verify rating is valid range (1-5)
  TestValidator.predicate(
    "rating is valid range",
    firstUpdate.rating >= 1 && firstUpdate.rating <= 5,
  );
  TestValidator.predicate(
    "second rating is valid range",
    secondUpdate.rating >= 1 && secondUpdate.rating <= 5,
  );
  // 9. Verify text can be null (optional field)
  const nullTextBody = {
    review_text: null,
  } satisfies IEcommerceMallReview.IUpdate;
  const nullTextUpdate =
    await api.functional.ecommerceMall.member.reviews.update(
      authenticatedConnection,
      {
        reviewId,
        body: nullTextBody,
      },
    );
  typia.assert(nullTextUpdate);
  TestValidator.equals(
    "review text can be null",
    nullTextUpdate.review_text,
    null,
  );
}
