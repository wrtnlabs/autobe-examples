import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function getShoppingMallSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string;
}): Promise<IShoppingMallSection> {
  // Validate that sectionId is a valid UUID format
  if (!typia.is<string & tags.Format<"uuid">>(props.sectionId)) {
    throw new HttpException("Invalid sectionId format", 400);
  }
  // Query the database for the specific section
  const section = await MyGlobal.prisma.shopping_mall_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  // Return 404 if section not found
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Return the section data mapped to IShoppingMallSection DTO
  return {
    name: section.name,
    description: section.description ?? undefined,
    parentId: section.parent_section_id ?? undefined,
    categoryId: section.id,
  };
}
