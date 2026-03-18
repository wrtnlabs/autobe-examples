import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestReviewTransformer } from "../transformers/ShoppingMallSellerApprovalRequestReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSellerApprovalRequestsSellerApprovalRequestIdReviewsSellerApprovalRequestReviewId(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  sellerApprovalRequestReviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerApprovalRequestReview> {
  const review =
    await MyGlobal.prisma.shopping_mall_seller_approval_request_reviews.findFirstOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestReviewId,
          shopping_mall_seller_approval_request_id:
            props.sellerApprovalRequestId,
        },
        ...ShoppingMallSellerApprovalRequestReviewTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestReviewTransformer.transform(
    review,
  );
}
