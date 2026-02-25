import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
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

export async function patchEcommerceAdministratorMetadataRegistriesRegistryIdRelationshipsRelationshipIdSubtypes(props: {
  administrator: AdministratorPayload;
  registryId: string & tags.Format<"uuid">;
  relationshipId: string & tags.Format<"uuid">;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  // Verify registry exists
  const registry =
    await MyGlobal.prisma.ecommerce_metadata_registries.findFirst({
      where: {
        id: props.registryId,
      },
    });
  if (!registry) {
    throw new HttpException("Metadata registry not found", 404);
  }
  // Verify parent relationship exists and belongs to registry
  const parentRelationship =
    await MyGlobal.prisma.ecommerce_metadata_registry_relationships.findFirst({
      where: {
        id: props.relationshipId,
        metadata_registry_id: props.registryId,
      },
    });
  if (!parentRelationship) {
    throw new HttpException("Metadata registry relationship not found", 404);
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where conditions - focus on filtering relationship subtypes
  const whereInput = {
    ...(props.body.createdAt_from && {
      created_at: {
        gte: new Date(props.body.createdAt_from),
      },
    }),
    ...(props.body.createdAt_to && {
      created_at: {
        lte: new Date(props.body.createdAt_to),
      },
    }),
  } satisfies Prisma.ecommerce_administrative_actionsWhereInput;
  // For userType filtering, we need to handle special relationship subtypes joining logic
  if (props.body.userType === "customer") {
    // Filter for customer-related administrative actions
    Object.assign(whereInput, {
      action_type: {
        in: ["customer_warning", "customer_ban", "customer_account_update"],
      },
    });
  } else if (props.body.userType === "seller") {
    // Filter for seller-related administrative actions
    Object.assign(whereInput, {
      action_type: {
        in: ["seller_approval", "seller_suspension", "seller_verification"],
      },
    });
  } else if (
    props.body.userType === "administrator" ||
    props.body.userType === "superAdministrator"
  ) {
    // Filter for administrator-related administrative actions
    Object.assign(whereInput, {
      action_type: {
        in: [
          "admin_promotion",
          "admin_permission_update",
          "admin_access_review",
        ],
      },
    });
  }
  // Search filtering
  if (props.body.search) {
    Object.assign(whereInput, {
      OR: [
        {
          general_description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        { action_type: { contains: props.body.search, mode: "insensitive" } },
      ],
    });
  }
  // Account status filtering
  if (props.body.accountStatus) {
    Object.assign(whereInput, {
      general_description: {
        contains: props.body.accountStatus,
        mode: "insensitive",
      },
    });
  }
  // Query administrative actions (mapped to IEcommerceMetadataRegistryRelationship.ISummary)
  const actions =
    await MyGlobal.prisma.ecommerce_administrative_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        administrator: {
          select: { id: true, email: true, created_at: true },
        } satisfies Prisma.ecommerce_administratorsFindManyArgs,
        superAdministrator: {
          select: { id: true, email: true, created_at: true },
        } satisfies Prisma.ecommerce_super_administratorsFindManyArgs,
      },
    });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_administrative_actions.count({
    where: whereInput,
  });
  // Transform results to match IEcommerceMetadataRegistryRelationship.ISummary DTO
  const data = actions.map(
    (action) =>
      ({
        id: action.id as string & tags.Format<"uuid">,
        action_type: action.action_type,
        general_description: action.general_description,
        created_at: toISOStringSafe(action.created_at) as string &
          tags.Format<"date-time">,
        administrator: action.administrator
          ? ({
              id: action.administrator.id as string & tags.Format<"uuid">,
              email: action.administrator.email as string &
                tags.Format<"email">,
              created_at: toISOStringSafe(
                action.administrator.created_at,
              ) as string & tags.Format<"date-time">,
            } satisfies IEcommerceAdministrator.ISummary)
          : null,
        superAdministrator: action.superAdministrator
          ? ({
              id: action.superAdministrator.id as string & tags.Format<"uuid">,
              email: action.superAdministrator.email as string &
                tags.Format<"email">,
              created_at: toISOStringSafe(
                action.superAdministrator.created_at,
              ) as string & tags.Format<"date-time">,
            } satisfies IEcommerceSuperAdministrator.ISummary)
          : null,
      }) satisfies IEcommerceMetadataRegistryRelationship.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMetadataRegistryRelationship.ISummary;
}
