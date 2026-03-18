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

export async function patchShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdReviews(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequestReview.IRequest;
}): Promise<IShoppingMallAdministratorRequestReview> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
      },
      select: {
        id: true,
        grade: true,
        account_status: true,
      },
    });
  if (administrator.account_status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  if (administrator.grade !== "super administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const request =
      await prisma.shopping_mall_administrator_requests.findUniqueOrThrow({
        where: {
          id: props.administratorRequestId,
        },
        select: {
          id: true,
          status: true,
        },
      });
    if (request.status !== "pending") {
      throw new HttpException("Conflict", 409);
    }
    await prisma.shopping_mall_administrator_requests.update({
      where: {
        id: props.administratorRequestId,
      },
      data: {
        status: props.body.decision === "reject" ? "rejected" : "approved",
        ...(props.body.decision === "reject" &&
        props.body.rejectedReason !== undefined
          ? { rejected_reason: props.body.rejectedReason }
          : {}),
      },
    });
    return await prisma.shopping_mall_administrator_request_reviews.create({
      data: {
        id: v4(),
        shopping_mall_administrator_request_id: props.administratorRequestId,
        shopping_mall_administrator_id: props.administrator.id,
        decision: props.body.decision,
        created_at: new Date(),
      },
      ...ShoppingMallAdministratorRequestReviewTransformer.select(),
    });
  });
  return await ShoppingMallAdministratorRequestReviewTransformer.transform(
    created,
  );
}
