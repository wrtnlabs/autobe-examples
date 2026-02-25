import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModeratorAssignmentTransformer } from "../transformers/RedditCloneModeratorAssignmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorAssignmentsAssignmentId(props: {
  assignmentId: string;
}): Promise<IRedditCloneModeratorAssignment> {
  const assignment =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findUniqueOrThrow({
      where: { id: props.assignmentId },
      ...RedditCloneModeratorAssignmentTransformer.select(),
    });
  return await RedditCloneModeratorAssignmentTransformer.transform(assignment);
}
