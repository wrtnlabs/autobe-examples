import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_customer_review_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16) satisfies string &
          tags.Format<"password">,
        href: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 1,
          sentenceMax: 1,
        }) satisfies string & tags.Format<"uri">,
        referrer: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 1,
          sentenceMax: 1,
        }) satisfies string & tags.Format<"uri">,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create initial review with rating 5 and test text
  const product_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: "Excellent product!",
          product_id,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(initialReview);
  // 3. Update review to trigger snapshot audit creation
  const updatedReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: "Good product but room for improvement",
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 4. Retrieve snapshot audit - using generated audit ID for test
  // Note: In real scenario, audit ID would be obtained from edit response or history query
  const snapshotAuditId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotAudit: IEcommerceMallSnapshotAudit =
    await api.functional.ecommerceMall.customer.snapshot_audits.at(
      customerConnection,
      {
        auditId: snapshotAuditId,
      },
    );
  typia.assert(snapshotAudit);
  // 5. Validate snapshot audit data structure
  TestValidator.equals(
    "record type is review",
    snapshotAudit.recordType,
    "review",
  );
  TestValidator.equals(
    "record id matches review",
    snapshotAudit.recordId,
    initialReview.id,
  );
  TestValidator.predicate(
    "old rating exists",
    snapshotAudit.oldValues.rating !== undefined,
  );
  TestValidator.predicate(
    "new rating exists",
    snapshotAudit.newValues.rating !== undefined,
  );
  TestValidator.predicate(
    "old text exists",
    snapshotAudit.oldValues.text_content !== undefined,
  );
  TestValidator.predicate(
    "new text exists",
    snapshotAudit.newValues.text_content !== undefined,
  );
  TestValidator.predicate(
    "changedAt timestamp exists",
    snapshotAudit.changedAt !== undefined,
  );
  TestValidator.equals(
    "changedBy matches customer",
    snapshotAudit.changedBy,
    customer.id,
  );
  TestValidator.predicate(
    "snapshot is immutable",
    snapshotAudit.createdAt === snapshotAudit.updatedAt,
  );
}
