import { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminUserBanOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAdminUserBanOfCustomerAtSummaryTransformer } from "../transformers/EcommerceAdminUserBanOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdministrativeActionsAdministrativeActionIdCustomerTargets(props: {
  administrator: AdministratorPayload;
  administrativeActionId: string & tags.Format<"uuid">;
  body: IEcommerceAdminUserBanOfCustomer.IRequest;
}): Promise<IPageIEcommerceAdminUserBanOfCustomer.ISummary> {
  // Validate administrative action exists
  await MyGlobal.prisma.ecommerce_administrative_actions.findUniqueOrThrow({
    where: { id: props.administrativeActionId },
  });
  // Extract pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper conditional date filtering
  const whereBase = {
    ecommerce_administrative_action_id: props.administrativeActionId,
    deleted_at: null,
  } satisfies Prisma.ecommerce_administrative_action_of_customersWhereInput;
  // Handle optional filters
  const whereWithCustomerId = props.body.customer_id
    ? { ...whereBase, ecommerce_customer_id: props.body.customer_id }
    : whereBase;
  const whereWithDateRange =
    props.body.created_after || props.body.created_before
      ? {
          ...whereWithCustomerId,
          created_at: {
            ...(props.body.created_after && { gte: props.body.created_after }),
            ...(props.body.created_before && {
              lte: props.body.created_before,
            }),
          },
        }
      : whereWithCustomerId;
  // Sequential database queries
  const data =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.findMany(
      {
        where: whereWithDateRange,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceAdminUserBanOfCustomerAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_administrative_action_of_customers.count({
      where: whereWithDateRange,
    });
  // Transform data using the transformer (handles datetime conversion)
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAdminUserBanOfCustomerAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
