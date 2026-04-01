import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_browse_active_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const baseRequest = {
    page: 1,
    limit: 20,
    sort: "newest",
  } satisfies IMallPlatformReview.IRequest;
  const firstPage = await api.functional.mallPlatform.customer.reviews.index(
    customerConnection,
    {
      body: baseRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "review page records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "review page pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "review page current should be non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "review page limit should be non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "review data length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (let i: number = 1; i < firstPage.data.length; ++i) {
    const previous: IMallPlatformReview.ISummary = firstPage.data[i - 1]!;
    const current: IMallPlatformReview.ISummary = firstPage.data[i]!;
    TestValidator.predicate(
      "reviews should be ordered newest first",
      previous.createdAt >= current.createdAt,
    );
  }
  for (const review of firstPage.data) {
    typia.assert(review);
    TestValidator.predicate(
      "active review should not be deleted",
      review.deletedAt === null,
    );
    TestValidator.predicate(
      "review rating should be within valid range",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review content should be null or string",
      review.content === null || typeof review.content === "string",
    );
  }
  const productId: string | undefined = firstPage.data[0]?.product.id;
  if (productId !== undefined) {
    const productPage =
      await api.functional.mallPlatform.customer.reviews.index(
        customerConnection,
        {
          body: {
            ...baseRequest,
            productId,
          } satisfies IMallPlatformReview.IRequest,
        },
      );
    typia.assert(productPage);
    TestValidator.predicate(
      "product scoped review page should be valid",
      productPage.pagination.records >= 0 && productPage.pagination.pages >= 0,
    );
    for (const review of productPage.data) {
      typia.assert(review);
      TestValidator.equals(
        "product scoped review should match requested product",
        review.product.id,
        productId,
      );
      TestValidator.predicate(
        "product scoped review should be active",
        review.deletedAt === null,
      );
    }
    for (let i: number = 1; i < productPage.data.length; ++i) {
      const previous: IMallPlatformReview.ISummary = productPage.data[i - 1]!;
      const current: IMallPlatformReview.ISummary = productPage.data[i]!;
      TestValidator.predicate(
        "product scoped reviews should be ordered newest first",
        previous.createdAt >= current.createdAt,
      );
    }
    const ratedReview: IMallPlatformReview.ISummary | undefined =
      productPage.data[0];
    if (ratedReview !== undefined) {
      const ratingPage =
        await api.functional.mallPlatform.customer.reviews.index(
          customerConnection,
          {
            body: {
              ...baseRequest,
              productId,
              rating: typia.assert<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(ratedReview.rating),
            } satisfies IMallPlatformReview.IRequest,
          },
        );
      typia.assert(ratingPage);
      for (const review of ratingPage.data) {
        typia.assert(review);
        TestValidator.equals(
          "rating filtered review should match requested rating",
          review.rating,
          ratedReview.rating,
        );
        TestValidator.equals(
          "rating filtered review should match requested product",
          review.product.id,
          productId,
        );
        TestValidator.predicate(
          "rating filtered review should be active",
          review.deletedAt === null,
        );
      }
      const contentCandidates = ratingPage.data.filter(
        (review) => review.content !== null,
      );
      const contentReview: IMallPlatformReview.ISummary | undefined =
        contentCandidates.length > 0 ? contentCandidates[0] : undefined;
      if (contentReview !== undefined && contentReview.content !== null && contentReview.content.length > 0) {
        const keyword: string = RandomGenerator.substring(
          contentReview.content,
        );
        const searchPage =
          await api.functional.mallPlatform.customer.reviews.index(
            customerConnection,
            {
              body: {
                ...baseRequest,
                productId,
                search: keyword,
              } satisfies IMallPlatformReview.IRequest,
            },
          );
        typia.assert(searchPage);
        for (const review of searchPage.data) {
          typia.assert(review);
          TestValidator.equals(
            "search filtered review should match requested product",
            review.product.id,
            productId,
          );
          TestValidator.predicate(
            "search filtered review should be active",
            review.deletedAt === null,
          );
          TestValidator.predicate(
            "search filtered review should contain keyword when content exists",
            review.content === null ? true : review.content.includes(keyword),
          );
        }
      }
      const emptySearchPage =
        await api.functional.mallPlatform.customer.reviews.index(
          customerConnection,
          {
            body: {
              ...baseRequest,
              productId,
              search: RandomGenerator.alphaNumeric(24),
            } satisfies IMallPlatformReview.IRequest,
          },
        );
      typia.assert(emptySearchPage);
      TestValidator.equals(
        "empty search should return no reviews",
        emptySearchPage.data.length,
        0,
      );
      TestValidator.predicate(
        "empty search pagination should be consistent",
        emptySearchPage.pagination.records >= 0 &&
          emptySearchPage.pagination.pages >= 0,
      );
    }
  }
}
