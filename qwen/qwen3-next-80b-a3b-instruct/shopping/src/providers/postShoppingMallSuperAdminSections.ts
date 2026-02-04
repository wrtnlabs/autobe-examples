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

export async function postShoppingMallSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  // Generate UUID for categoryId
  const categoryId = v4();
  // Create timestamp using toISOStringSafe
  const now = toISOStringSafe(new Date());
  // Create section record
  const createdSection = await MyGlobal.prisma.shopping_mall_sections.create({
    data: {
      id: categoryId,
      name: props.body.name,
      description: props.body.description ?? null,
      parent_section_id: props.body.parentId ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  // Return full section object with system-generated values
  return {
    categoryId: createdSection.id, // Correct field name per IShoppingMallSection interface
    name: createdSection.name,
    description:
      createdSection.description !== null
        ? createdSection.description
        : undefined,
    parentId:
      createdSection.parent_section_id !== null
        ? createdSection.parent_section_id
        : undefined,
  };
}
