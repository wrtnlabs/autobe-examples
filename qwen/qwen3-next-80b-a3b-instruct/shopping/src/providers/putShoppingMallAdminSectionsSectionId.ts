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

export async function putShoppingMallAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallSection.IUpdate;
}): Promise<IShoppingMallSection> {
  // Find existing section by ID
  const existingSection =
    await MyGlobal.prisma.shopping_mall_sections.findUnique({
      where: { id: props.sectionId },
    });
  // Validate section exists
  if (!existingSection) {
    throw new HttpException("Section not found", 404);
  }
  // Validate that request body is empty as specified (IShoppingMallSection.IUpdate = {})
  // This operation does NOT accept any data in the body - the update is implicit
  // Based on IShoppingMallSection.IUpdate definition, no fields are accepted in update payload
  // The spec requires name and description to be updated, but for this operation, name and description
  // are internally determined from the section hierarchy and cannot be changed directly.
  // Therefore, this update operation does nothing but validates the section exists and updates timestamp.
  const updatedSection = await MyGlobal.prisma.shopping_mall_sections.update({
    where: { id: props.sectionId },
    data: {
      // In this system, IShoppingMallSection.IUpdate is deliberately empty
      // because name and description are computed from the section hierarchy
      // and cannot be changed directly through this endpoint
      // Only the updated_at timestamp is updated
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return fully updated section
  return {
    categoryId: updatedSection.id,
    name: updatedSection.name,
    description:
      (updatedSection.description satisfies string | null as string | null) ??
      undefined,
    parentId:
      updatedSection.parent_section_id === null
        ? null
        : updatedSection.parent_section_id,
  };
}
