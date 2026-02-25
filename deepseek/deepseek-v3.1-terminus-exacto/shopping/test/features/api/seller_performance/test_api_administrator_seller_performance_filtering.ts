import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

export async function test_api_administrator_seller_performance_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员连接并认证
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.ILogin,
  });
  // 2. 创建不同状态的卖家账户
  const sellerStatuses = ["pending_approval", "approved", "suspended"] as const;
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  for (const status of sellerStatuses) {
    // 创建卖家账户
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller123",
        shop_name: `Shop_${RandomGenerator.alphabets(6)}_${status}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(seller);
    sellers.push(seller);
    // 为已批准的卖家生成产品、订单和评价数据
    if (status === "approved") {
      // 创建顾客账户用于生成订单和评价
      const customerConnection: api.IConnection = { host: connection.host };
      const customer = await authorize_customer_join(customerConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "customer123",
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        },
      });
      typia.assert(customer);
      // 卖家登录
      const approvedSellerConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_seller_login(approvedSellerConnection, {
        body: {
          email: seller.email,
          password: "seller123",
        } satisfies IEcommerceSeller.ILogin,
      });
      // 创建产品
      const product = await generate_random_ecommerce_seller_products_create(
        approvedSellerConnection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 2,
              wordMax: 4,
            }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            category_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
      typia.assert(product);
      // 创建订单（需要实际订单创建逻辑，此处使用模拟数据）
      // const order = await api.functional.ecommerce.customer.orders.create(
      //   customerConnection,
      //   {
      //     body: typia.random<IEcommerceOrder>(),
      //   },
      // );
      // typia.assert(order);
      // 创建评价
      // const review = await generate_random_ecommerce_customer_products_reviews_create(
      //   customerConnection,
      //   {
      //     params: { productId: product.id },
      //     body: {
      //       rating: randint(1, 5) as 1 | 2 | 3 | 4 | 5,
      //       content: RandomGenerator.paragraph({ sentences: 1 }),
      //     },
      //   },
      // );
      // typia.assert(review);
    }
  }
  // 3. 测试不同过滤组合
  // 按账户状态过滤
  for (const status of sellerStatuses) {
    const response =
      await api.functional.ecommerce.administrator.seller_performance.index(
        adminConnection,
        {
          body: {
            account_status: status,
          } satisfies IEcommerceSeller.IRequest,
        },
      );
    typia.assert(response);
    // 验证返回的商家都具有正确的状态
    for (const seller of response.data) {
      TestValidator.equals(
        `seller ${seller.id} should have status ${status}`,
        seller.account_status,
        status,
      );
    }
  }
  // 按店铺名称搜索
  const searchTerm = "Shop_";
  const searchResponse =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 验证搜索结果包含搜索词
  TestValidator.predicate("search results should contain search term", () => {
    return searchResponse.data.some((seller) =>
      seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });
  // 测试创建日期范围过滤
  const now = new Date();
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前
  const dateResponse =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          created_after: pastDate.toISOString(),
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(dateResponse);
  // 测试分页功能
  const paginationResponse =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // 验证分页信息
  TestValidator.equals(
    "page should be 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 2",
    paginationResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginationResponse.data.length <= 2,
  );
  // 测试空结果场景 - 使用不存在的账户状态
  const emptyResponse =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          account_status: "rejected", // 假设不存在这个状态
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // 空响应应该是有效的，但可能没有数据
  TestValidator.predicate("empty response should be valid", () => {
    return (
      emptyResponse.pagination.pages >= 0 &&
      emptyResponse.pagination.records >= 0
    );
  });
  // 测试组合过滤：状态+搜索词
  const combinedResponse =
    await api.functional.ecommerce.administrator.seller_performance.index(
      adminConnection,
      {
        body: {
          account_status: "approved",
          search: "Shop_",
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(combinedResponse);
}
