import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestReviewTransformer } from "../transformers/ShoppingMallAdministratorRequestReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdReviewsAdministratorRequestReviewId(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  administratorRequestReviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorRequestReview> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const review =
    await MyGlobal.prisma.shopping_mall_administrator_request_reviews.findFirstOrThrow(
      {
        where: {
          id: props.administratorRequestReviewId,
          shopping_mall_administrator_request_id: props.administratorRequestId,
        },
        ...ShoppingMallAdministratorRequestReviewTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestReviewTransformer.transform(
    review,
  );
}
