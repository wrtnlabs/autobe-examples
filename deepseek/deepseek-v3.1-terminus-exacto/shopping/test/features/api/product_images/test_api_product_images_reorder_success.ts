import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";

export async function test_api_product_images_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. 卖家认证
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. 创建产品（需要有效的分类ID，这里假设有一个默认分类或先创建分类）
  // 由于没有分类创建API，我们使用随机UUID并假设它存在
  // 在实际测试中，应该先创建分类或使用已知的分类ID
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. 上传多个初始图片（3张）
  const images: IEcommerceProductImage[] = [];
  for (let i = 1; i <= 3; i++) {
    const image = await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          position: i satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IEcommerceProductImage.ICreate,
      },
    );
    typia.assert(image);
    images.push(image);
  }
  // 验证初始图片位置
  for (let i = 0; i < images.length; i++) {
    TestValidator.equals(`初始图片位置 ${i + 1}`, images[i].position, i + 1);
  }
  // 4. 重新排序图片：反转顺序
  // 根据SDK，updateOrder用于更新单个图片的位置
  // 我们将按新顺序（反转）更新每个图片
  const reversedOrder = [...images].reverse();
  // 存储更新后的图片
  const updatedImages: IEcommerceProductImage[] = [];
  for (let i = 0; i < reversedOrder.length; i++) {
    const image = reversedOrder[i];
    const newPosition = i + 1;
    // 调用updateOrder更新单个图片的位置
    const updatedImage =
      await api.functional.ecommerce.seller.products.images.updateOrder(
        sellerConnection,
        {
          productId: product.id,
          body: {
            position: newPosition,
          } satisfies IEcommerceProductImage.IUpdate,
        },
      );
    typia.assert(updatedImage);
    updatedImages.push(updatedImage);
  }
  // 由于是顺序更新，我们需要获取当前所有图片来验证最终状态
  // 假设有API可以获取产品所有图片，但这里没有提供
  // 我们将使用更新后的图片列表进行验证
  // 5. 验证事务一致性
  // 检查所有图片都有唯一且连续的位置
  const finalPositions = updatedImages
    .map((img) => img.position)
    .sort((a, b) => a - b);
  for (let i = 0; i < finalPositions.length; i++) {
    TestValidator.equals(`位置连续性 ${i + 1}`, finalPositions[i], i + 1);
  }
  // 验证位置唯一性
  const uniquePositions = new Set(updatedImages.map((img) => img.position));
  TestValidator.equals(
    "位置唯一性",
    uniquePositions.size,
    updatedImages.length,
  );
  // 6. 验证第一张图片位置为1（成为缩略图）
  const thumbnailImage = updatedImages.find((img) => img.position === 1);
  TestValidator.predicate("存在位置为1的缩略图", thumbnailImage !== undefined);
  // 验证图片按新顺序排列
  // 由于我们单独更新了每个图片，应该按反转顺序排列
  // 检查updatedImages中图片的顺序（按position排序）
  const sortedByPosition = [...updatedImages].sort(
    (a, b) => a.position - b.position,
  );
  // 验证sortedByPosition中的图片ID与reversedOrder匹配（相同顺序）
  for (let i = 0; i < sortedByPosition.length; i++) {
    TestValidator.equals(
      `图片位置 ${i + 1} 的ID匹配`,
      sortedByPosition[i].id,
      reversedOrder[i].id,
    );
  }
  // 验证所有图片ID都存在（完整性检查）
  const allImageIds = new Set(images.map((img) => img.id));
  for (const updatedImage of updatedImages) {
    TestValidator.predicate(
      `图片 ${updatedImage.id} 在原始图片集中`,
      allImageIds.has(updatedImage.id),
    );
  }
}
