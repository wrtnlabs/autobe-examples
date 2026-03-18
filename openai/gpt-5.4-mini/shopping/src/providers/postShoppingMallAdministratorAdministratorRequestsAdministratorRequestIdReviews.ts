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
import { ShoppingMallAdministratorRequestReviewCollector } from "../collectors/ShoppingMallAdministratorRequestReviewCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestReviewTransformer } from "../transformers/ShoppingMallAdministratorRequestReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdReviews(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequestReview.ICreate;
}): Promise<IShoppingMallAdministratorRequestReview> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const administratorRequest =
      await prisma.shopping_mall_administrator_requests.findUniqueOrThrow({
        where: {
          id: props.administratorRequestId,
        },
        select: {
          id: true,
          status: true,
        },
      });
    if (administratorRequest.status !== "pending") {
      throw new HttpException("Request is not pending", 400);
    }
    const created =
      await prisma.shopping_mall_administrator_request_reviews.create({
        data: await ShoppingMallAdministratorRequestReviewCollector.collect({
          body: props.body,
          administratorRequest: { id: props.administratorRequestId },
          administrator: { id: props.administrator.id },
        }),
        ...ShoppingMallAdministratorRequestReviewTransformer.select(),
      });
    await prisma.shopping_mall_administrator_requests.update({
      where: {
        id: props.administratorRequestId,
      },
      data: {
        status: props.body.decision === "approve" ? "approved" : "rejected",
        ...(props.body.decision === "reject"
          ? {
              rejected_reason: props.body.rejected_reason ?? null,
            }
          : {}),
      },
    });
    return await ShoppingMallAdministratorRequestReviewTransformer.transform(
      created,
    );
  });
}
