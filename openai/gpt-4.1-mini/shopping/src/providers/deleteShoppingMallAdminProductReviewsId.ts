import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductReviewsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify admin existence and non-deletion
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: admin.id, deleted_at: null },
    select: { id: true },
  });

  if (!adminRecord) {
    throw new HttpException("Unauthorized: Admin not found or deleted", 403);
  }

  try {
    await MyGlobal.prisma.shopping_mall_product_reviews.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Product review not found", 404);
    }
    throw error;
  }
}
