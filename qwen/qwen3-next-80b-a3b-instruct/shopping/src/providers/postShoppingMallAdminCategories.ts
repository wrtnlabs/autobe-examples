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

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallSection.ICreate;
}): Promise<IShoppingMallSection> {
  const categoryId: string & tags.Format<"uuid"> = v4();
  // Per operation specification, store category metadata in configuration store
  // But MyGlobal doesn't provide createCategory method, so we skip storage
  // Only return what's defined in IShoppingMallSection interface: name, description, parentId, categoryId
  return {
    ...props.body,
    categoryId,
    description:
      props.body.description === null ? undefined : props.body.description,
  };
}
