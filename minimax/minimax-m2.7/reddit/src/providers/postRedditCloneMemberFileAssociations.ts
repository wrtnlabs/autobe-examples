import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileAssociationCollector } from "../collectors/RedditCloneFileAssociationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFileAssociationTransformer } from "../transformers/RedditCloneFileAssociationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberFileAssociations(props: {
  member: MemberPayload;
  body: IRedditCloneFileAssociation.ICreate;
}): Promise<IRedditCloneFileAssociation> {
  // Step 1: Verify file exists and belongs to the authenticated member
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.body.redditCloneFileId },
    select: {
      id: true,
      uploader_id: true,
      status: true,
    },
  });
  if (file === null) {
    throw new HttpException("File not found", 404);
  }
  // Step 2: Verify the uploader matches the authenticated member
  if (file.uploader_id !== props.member.id) {
    throw new HttpException(
      "You can only associate your own uploaded files",
      403,
    );
  }
  // Step 3: Verify file status is 'processed'
  if (file.status !== "processed") {
    throw new HttpException(
      "File must be processed before creating association",
      400,
    );
  }
  // Step 4: Check unique constraint for [targetType, targetId]
  const existingAssociation =
    await MyGlobal.prisma.reddit_clone_file_associations.findUnique({
      where: {
        target_type_target_id: {
          target_type: props.body.targetType,
          target_id: props.body.targetId,
        },
      },
    });
  if (existingAssociation !== null) {
    throw new HttpException(
      "An association already exists for this target",
      409,
    );
  }
  // Step 5: Create the file association using collector
  const created = await MyGlobal.prisma.reddit_clone_file_associations.create({
    data: await RedditCloneFileAssociationCollector.collect({
      body: props.body,
      member: { id: props.member.id },
      session: { id: props.member.session_id },
    }),
    ...RedditCloneFileAssociationTransformer.select(),
  });
  // Step 6: Transform and return the response
  return await RedditCloneFileAssociationTransformer.transform(created);
}
