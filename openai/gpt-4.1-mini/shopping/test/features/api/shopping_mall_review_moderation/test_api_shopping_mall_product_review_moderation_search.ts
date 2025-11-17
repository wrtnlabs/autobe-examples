import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModeration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_review_moderation_search(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!",
    ip: undefined,
    href: `https://${RandomGenerator.alphabets(10)}.admin.join`,
    referrer: `https://${RandomGenerator.alphabets(10)}.admin.referrer`,
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: "Admin1234!",
    ip: undefined,
    href: `https://${RandomGenerator.alphabets(10)}.admin.login`,
    referrer: `https://${RandomGenerator.alphabets(10)}.admin.referrer`,
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 2. Seller joins and logs in
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller1234!",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "Seller1234!",
    ip: undefined,
    href: `https://${RandomGenerator.alphabets(10)}.seller.login`,
    referrer: `https://${RandomGenerator.alphabets(10)}.seller.referrer`,
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });

  // 3. Create a product by seller
  const categoryCode = RandomGenerator.alphaNumeric(6); // No category creation, generate random string

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(2),
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 4. Customer joins and logs in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const hrefUri = `https://www.${RandomGenerator.alphabets(10)}.customer`;
  const referrerUri = `https://www.referrer.${RandomGenerator.alphabets(10)}.example`;
  const customerJoinBody = {
    email: customerEmail,
    password: "Customer1234!",
    href: hrefUri,
    referrer: referrerUri,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: "Customer1234!",
    ip: undefined,
    href: hrefUri,
    referrer: referrerUri,
  } satisfies IShoppingMallCustomer.ILogin;
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 5. Customer creates a product review
  const rating = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewCreateBody = {
    shopping_mall_product_id: product.id,
    rating,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      { body: reviewCreateBody },
    );
  typia.assert(review);

  // 6. Switch back to admin to search review moderations
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 7. Perform moderation search with pagination and sorting ascending
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;

  const moderationSearchBodyAsc = {
    page,
    limit,
    sort_by: "created_at",
    order: "asc",
  } satisfies IShoppingMallReviewModeration.IRequest;

  const moderationSearchResultAsc: IPageIShoppingMallReviewModeration.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallProductReviews.shoppingMallReviewModerations.index(
      connection,
      {
        shoppingMallProductReviewId: review.id,
        body: moderationSearchBodyAsc,
      },
    );

  typia.assert(moderationSearchResultAsc);

  // Validate ascending order
  TestValidator.predicate(
    "pagination current page valid ascending",
    moderationSearchResultAsc.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit valid ascending",
    moderationSearchResultAsc.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages >= current page ascending",
    moderationSearchResultAsc.pagination.pages >= page,
  );
  TestValidator.predicate(
    "pagination records non negative ascending",
    moderationSearchResultAsc.pagination.records >= 0,
  );

  // Validate review ID in results
  for (const moderation of moderationSearchResultAsc.data) {
    typia.assert(moderation);
    TestValidator.equals(
      "moderation record belongs to review ascending",
      moderation.shopping_mall_product_review_id,
      review.id,
    );
  }

  // 8. Perform moderation search with sorting descending
  const moderationSearchBodyDesc = {
    page,
    limit,
    sort_by: "created_at",
    order: "desc",
  } satisfies IShoppingMallReviewModeration.IRequest;

  const moderationSearchResultDesc: IPageIShoppingMallReviewModeration.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallProductReviews.shoppingMallReviewModerations.index(
      connection,
      {
        shoppingMallProductReviewId: review.id,
        body: moderationSearchBodyDesc,
      },
    );

  typia.assert(moderationSearchResultDesc);

  TestValidator.predicate(
    "pagination current page valid descending",
    moderationSearchResultDesc.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit valid descending",
    moderationSearchResultDesc.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages >= current page descending",
    moderationSearchResultDesc.pagination.pages >= page,
  );
  TestValidator.predicate(
    "pagination records non negative descending",
    moderationSearchResultDesc.pagination.records >= 0,
  );

  for (const moderation of moderationSearchResultDesc.data) {
    typia.assert(moderation);
    TestValidator.equals(
      "moderation record belongs to review descending",
      moderation.shopping_mall_product_review_id,
      review.id,
    );
  }

  // 9. If at least one moderation record exists with an action, perform filtering by that action
  if (moderationSearchResultAsc.data.length > 0) {
    const existingAction = moderationSearchResultAsc.data[0].action;
    const moderationSearchBodyFilter = {
      page,
      limit,
      filter_moderation_action: existingAction,
    } satisfies IShoppingMallReviewModeration.IRequest;

    const moderationSearchResultFiltered: IPageIShoppingMallReviewModeration.ISummary =
      await api.functional.shoppingMall.admin.shoppingMallProductReviews.shoppingMallReviewModerations.index(
        connection,
        {
          shoppingMallProductReviewId: review.id,
          body: moderationSearchBodyFilter,
        },
      );

    typia.assert(moderationSearchResultFiltered);

    for (const moderation of moderationSearchResultFiltered.data) {
      typia.assert(moderation);
      TestValidator.equals(
        "filtered moderation action matches",
        moderation.action,
        existingAction,
      );
    }
  }
}
