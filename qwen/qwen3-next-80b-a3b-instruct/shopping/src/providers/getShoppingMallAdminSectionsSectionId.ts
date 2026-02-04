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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string;
}): Promise<IShoppingMallSection> {
  const section = await MyGlobal.prisma.shopping_mall_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  return {
    name: section.name,
    description: section.description === null ? undefined : section.description,
    parentId:
      section.parent_section_id === null
        ? undefined
        : section.parent_section_id,
    categoryId: section.id,
  };
}
