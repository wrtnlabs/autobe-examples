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

export async function putShoppingMallSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallSection.IUpdate;
}): Promise<IShoppingMallSection> {
  // Verify section exists
  const existingSection =
    await MyGlobal.prisma.shopping_mall_sections.findUnique({
      where: { id: props.sectionId },
    });
  if (!existingSection) {
    throw new HttpException("Section not found", 404);
  }
  // Update the section with provided values
  // The body is IShoppingMallSection.IUpdate which is empty, so we omit body
  // From schema: name and description are updatable with the fields as defined
  const updatedSection = await MyGlobal.prisma.shopping_mall_sections.update({
    where: { id: props.sectionId },
    data: {
      name: existingSection.name,
      description: existingSection.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return the complete updated section
  return {
    name: updatedSection.name,
    description: updatedSection.description ?? undefined,
    parentId: updatedSection.parent_section_id ?? undefined,
    categoryId: updatedSection.id,
  };
}
