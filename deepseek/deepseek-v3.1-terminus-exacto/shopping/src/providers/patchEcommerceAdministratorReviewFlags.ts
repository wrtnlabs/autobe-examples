import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewFlags(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewFlag.IRequest;
}): Promise<IPageIEcommerceReviewFlag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where condition with ISO string to timestamp conversion
  const whereInput: Prisma.ecommerce_review_flagsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.ecommerce_customer_id && {
      ecommerce_customer_id: props.body.ecommerce_customer_id,
    }),
    ...(props.body.ecommerce_review_id && {
      ecommerce_review_id: props.body.ecommerce_review_id,
    }),
    ...(props.body.ecommerce_administrator_id && {
      ecommerce_administrator_id: props.body.ecommerce_administrator_id,
    }),
    ...(props.body.search && {
      OR: [
        { reason: { contains: props.body.search } },
        { resolution_details: { contains: props.body.search } },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.assigned_at_from && {
      assigned_at: {
        gte: props.body.assigned_at_from
          ? new Date(props.body.assigned_at_from)
          : undefined,
      },
    }),
    ...(props.body.assigned_at_to && {
      assigned_at: {
        lte: props.body.assigned_at_to
          ? new Date(props.body.assigned_at_to)
          : undefined,
      },
    }),
    ...(props.body.resolved_at_from && {
      resolved_at: {
        gte: props.body.resolved_at_from
          ? new Date(props.body.resolved_at_from)
          : undefined,
      },
    }),
    ...(props.body.resolved_at_to && {
      resolved_at: {
        lte: props.body.resolved_at_to
          ? new Date(props.body.resolved_at_to)
          : undefined,
      },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_review_flags.findMany({
      where: whereInput,
      select: {
        id: true,
        status: true,
        reason: true,
        created_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
        review: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                created_at: true,
              },
            } satisfies Prisma.ecommerce_customersFindManyArgs,
          },
        } satisfies Prisma.ecommerce_reviewsFindManyArgs,
        administrator: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_administratorsFindManyArgs,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.ecommerce_review_flags.count({
      where: whereInput,
    }),
  ]);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const transformedData: IEcommerceReviewFlag.ISummary[] = data.map((flag) => {
    const status = flag.status;
    if (
      status !== "pending" &&
      status !== "under_review" &&
      status !== "resolved"
    ) {
      throw new HttpException(`Invalid status value: ${status}`, 500);
    }
    return {
      id: flag.id as string & tags.Format<"uuid">,
      status: status,
      reason: flag.reason,
      created_at: flag.created_at.toISOString() as string &
        tags.Format<"date-time">,
      customer: {
        id: flag.customer.id as string & tags.Format<"uuid">,
        email: flag.customer.email as string & tags.Format<"email">,
        display_name: flag.customer.display_name,
        created_at: flag.customer.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IEcommerceCustomer.ISummary,
      review: {
        id: flag.review.id as string & tags.Format<"uuid">,
        rating: flag.review.rating,
        content: flag.review.content,
        created_at: flag.review.created_at.toISOString() as string &
          tags.Format<"date-time">,
        customer: {
          id: flag.review.customer.id as string & tags.Format<"uuid">,
          email: flag.review.customer.email as string & tags.Format<"email">,
          display_name: flag.review.customer.display_name,
          created_at: flag.review.customer.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceCustomer.ISummary,
      } satisfies IEcommerceReview.ISummary,
      administrator: flag.administrator
        ? ({
            id: flag.administrator.id as string & tags.Format<"uuid">,
            email: flag.administrator.email as string & tags.Format<"email">,
            created_at: flag.administrator.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IEcommerceAdministrator.ISummary)
        : null,
    };
  });
  return {
    data: transformedData,
    pagination: pagination,
  };
}
