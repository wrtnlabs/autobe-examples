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

export async function postShoppingMallAdminSections(props: {
  admin: AdminPayload;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  // Create the section with auto-generated fields
  const created = await MyGlobal.prisma.shopping_mall_sections.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      description: props.body.description,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      // Use scalar field name parent_section_id for direct assignment if parentId is provided
      parent_section_id: props.body.parentId ? props.body.parentId : undefined,
    },
  });
  // Return the full section object with all fields - map id to categoryId as per interface
  return {
    categoryId: created.id,
    name: created.name,
    description:
      props.body.description === null ? undefined : props.body.description,
    parentId: props.body.parentId === null ? undefined : props.body.parentId,
  };
}
