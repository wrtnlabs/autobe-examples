import { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerNotifications(props: {
  seller: SellerPayload;
  body: IEcommerceMallNotification.IRequest;
}): Promise<IPageIEcommerceMallNotification.ISummary> {
  const page = props.body.page ?? 1;
  const perPage = props.body.per_page ?? 100;
  const limit = props.body.limit ?? perPage;
  const skip = (page - 1) * limit;
  // Build WHERE clause for notification_recipients
  const whereInput: Prisma.ecommerce_mall_notification_recipientsWhereInput = {
    deleted_at: null,
    recipient_type: "seller",
    recipient_id: props.seller.id,
  };
  // Build WHERE clause for notifications (joined relation)
  const notificationWhere: Prisma.ecommerce_mall_notificationsWhereInput = {
    deleted_at: null,
  };
  if (props.body.read_status) {
    notificationWhere.status = props.body.read_status;
  }
  if (props.body.type) {
    notificationWhere.type = props.body.type;
  }
  let createdAtGte: Date | undefined;
  if (props.body.created_at_from) {
    createdAtGte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to) {
    if (createdAtGte) {
      notificationWhere.created_at = {
        gte: createdAtGte,
        lte: new Date(props.body.created_at_to),
      };
    } else {
      notificationWhere.created_at = {
        lte: new Date(props.body.created_at_to),
      };
    }
  } else if (createdAtGte) {
    notificationWhere.created_at = {
      gte: createdAtGte,
    };
  }
  if (props.body.search) {
    // Full-text search on title and body using trigram index
    const searchTerms = props.body.search.split(" ").filter(Boolean);
    if (searchTerms.length > 0) {
      notificationWhere.OR = searchTerms.map((term) => ({
        title: {
          contains: term,
          mode: "insensitive",
        },
      }));
    }
  }
  whereInput.notification = notificationWhere;
  // Build ORDER BY with proper typing
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = (props.body.order ?? "desc") as "asc" | "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_notification_recipientsOrderByWithRelationInput;
  // Execute query with notification relation included
  const data =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      include: {
        notification: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_notification_recipients.count({
      where: whereInput,
    });
  // Transform to ISummary
  const summaryData: IEcommerceMallNotification.ISummary[] = data.map(
    (record) => {
      const notification = record.notification;
      return {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        status: notification.status,
        created_at: toISOStringSafe(notification.created_at),
        updated_at: toISOStringSafe(notification.updated_at),
      };
    },
  );
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
