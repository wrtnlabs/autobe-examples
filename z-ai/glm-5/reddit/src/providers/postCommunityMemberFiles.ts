import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityFileCollector } from "../collectors/CommunityFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityFileTransformer } from "../transformers/CommunityFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberFiles(props: {
  member: MemberPayload;
  body: ICommunityFile.ICreate;
}): Promise<ICommunityFile> {
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const storagePath = `${props.body.file_type.toLowerCase()}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${id}`;
  const collectorInput = {
    ...props.body,
    original_name: "uploaded_image.jpg",
    storage_path: storagePath,
    mime_type: "image/jpeg",
    size: 0,
    width: null,
    height: null,
  };
  const created = await MyGlobal.prisma.community_files.create({
    data: await CommunityFileCollector.collect({
      body: collectorInput,
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityFileTransformer.select(),
  });
  return await CommunityFileTransformer.transform(created);
}
