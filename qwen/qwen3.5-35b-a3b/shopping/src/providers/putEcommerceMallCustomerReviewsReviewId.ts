import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  const existing =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  if (existing.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const changes: Array<{
    field: "rating" | "text_content";
    oldValue: number | string | null;
    newValue: number | string | null;
  }> = [];
  if (props.body.rating !== undefined) {
    if (existing.rating !== props.body.rating) {
      changes.push({
        field: "rating",
        oldValue: existing.rating,
        newValue: props.body.rating,
      });
    }
  }
  if (props.body.text_content !== undefined) {
    const newValue = props.body.text_content ?? null;
    if (existing.text_content !== newValue) {
      changes.push({
        field: "text_content",
        oldValue: existing.text_content,
        newValue,
      });
    }
  }
  if (changes.length > 0) {
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
      data: {
        id: v4(),
        record_type: "Review",
        record_id: existing.id,
        changes: changes.map((c) => c.field).join(","),
        old_values: JSON.stringify(
          changes.reduce((acc: Record<string, unknown>, c) => {
            acc[c.field] = c.oldValue;
            return acc;
          }, {}),
        ),
        new_values: JSON.stringify(
          changes.reduce((acc: Record<string, unknown>, c) => {
            acc[c.field] = c.newValue;
            return acc;
          }, {}),
        ),
        changed_at: now,
        changed_by: props.customer.id,
        created_at: now,
        updated_at: now,
      },
    });
  }
  const updateData: {
    rating?: number;
    text_content?: string | null;
    updated_at: string & tags.Format<"date-time">;
    is_active?: boolean;
    deleted_at?: null;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.rating !== undefined) {
    updateData.rating = props.body.rating;
  }
  if (props.body.text_content !== undefined) {
    updateData.text_content = props.body.text_content;
  }
  if (!existing.is_active) {
    updateData.is_active = true;
    updateData.deleted_at = null;
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
    ...EcommerceMallReviewTransformer.select(),
  });
  return await EcommerceMallReviewTransformer.transform(updated);
}
