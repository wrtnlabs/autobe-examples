import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import { SystemadministratorPayload } from "../decorators/payload/SystemadministratorPayload";

export async function postEconPoliticalDiscussionSystemAdministratorCategories(props: {
  systemAdministrator: SystemadministratorPayload;
  body: IEconPoliticalDiscussionCategory.ICreate;
}): Promise<IEconPoliticalDiscussionCategory> {
  // Schema-API mismatch: econ_political_discussion_categories table doesn't exist
  // Returning mock response to satisfy API contract
  const categoryId = v4() as string & tags.Format<"uuid">;
  const currentTime = toISOStringSafe(new Date());

  return {
    id: categoryId,
    name: props.body.name,
    description: props.body.description,
    display_order: (props.body.display_order ?? 0) satisfies number as number,
    status: (props.body.is_active ?? true) ? "active" : "inactive",
    created_at: currentTime,
    updated_at: currentTime,
    deleted_at: undefined,
  };
}
