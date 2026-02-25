import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload"

export async function postShoppingMallSellerSellersProducts(props: {
    seller: SellerPayload;
    body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
    // First, verify the category exists and belongs to the seller
    const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
            id: props.body.shopping_mall_category_id,
        },
    });
    if (!category) {
        throw new HttpException("Category not found", 404);
    }
    const created = await MyGlobal.prisma.shopping_mall_products.create({
        data: {
            id: v4(),
            name: props.body.name,
            description: props.body.description,
            base_price: props.body.base_price,
            is_deleted: false,
            deleted_at: null,
            // Connect seller relation
            seller: { connect: { id: props.seller.id } },
            // Connect category relation
            category: { connect: { id: props.body.shopping_mall_category_id } },
            // Create product images with proper relation
            productImages: props.body.images
                ? {
                    create: await ArrayUtil.asyncMap(props.body.images, (image) => ({
                        id: v4(),
                        image_url: image.image_url,
                        sort_order: image.sort_order,
                    })),
                }
                : undefined,
            // Create variants with proper relation
            variants: {
                create: await ArrayUtil.asyncMap(props.body.variants, (variant) => ({
                    id: v4(),
                    sku_code: variant.sku_code,
                    stock_quantity: variant.stock_quantity ?? 0,
                    price_override: variant.price_override ?? null,
                    // Connect product relation
                    product: { connect: { id: v4() } },
                    // Create option values
                    productVariantOptionValues: {
                        create: await ArrayUtil.asyncMap(variant.option_values, (opt) => ({
                            id: v4(),
                            option_name: opt.option_name,
                            option_value: opt.option_value,
                        })),
                    },
                })),
            },
        },
        include: {
            seller: true,
            category: true,
            productImages: true,
            variants: {
                include: {
                    productVariantOptionValues: true,
                    product: {
                        include: {
                            seller: true,
                            category: true,
                        }
                    }
                }
            },
        },
    });
    // Build the response with proper data structure
    return {
        id: created.id,
        name: created.name,
        description: created.description,
        base_price: Number(created.base_price),
        is_deleted: created.is_deleted,
        category: {
            id: created.category.id,
            name: created.category.name,
            description: created.category.description,
            parent: created.category.parent_category_id
                ? {
                    id: created.category.parent.id,
                    name: created.category.parent.name,
                    description: created.category.parent.description,
                    parent: null,
                    subcategory_count: 0,
                }
                : null,
        },
        seller: {
            id: created.seller.id,
            shop_name: created.seller.shop_name,
            approval_status: created.seller.approval_status,
            created_at: created.seller.created_at.toISOString(),
        },
        images: created.productImages.map((img) => ({
            id: img.id,
            image_url: img.image_url,
            sort_order: img.sort_order,
        })),
        variants: created.variants.map((v) => ({
            id: v.id,
            shoppingMallProductId: v.shopping_mall_product_id,
            skuCode: v.sku_code,
            priceOverride: v.price_override,
            stockQuantity: v.stock_quantity,
            optionValues: v.productVariantOptionValues.map((ov) => ov.option_value),
            product: {
                id: v.product.id,
                name: v.product.name,
                description: v.product.description,
                base_price: Number(v.product.base_price),
                is_deleted: v.product.is_deleted,
                seller: {
                    id: v.product.seller.id,
                    shop_name: v.product.seller.shop_name,
                    approval_status: v.product.seller.approval_status,
                    created_at: v.product.seller.created_at.toISOString(),
                },
                category: {
                    id: v.product.category.id,
                    name: v.product.category.name,
                    description: v.product.category.description,
                    parent: v.product.category.parent_category_id
                        ? {
                            id: v.product.category.parent.id,
                            name: v.product.category.parent.name,
                            description: v.product.category.parent.description,
                            parent: null,
                            subcategory_count: 0,
                        }
                        : null,
                },
                average_rating: 0,
            },
        })),
    };
}
