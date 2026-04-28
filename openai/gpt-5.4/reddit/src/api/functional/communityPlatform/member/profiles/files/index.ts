import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformProfileFile } from "../../../../../structures/ICommunityPlatformProfileFile";
import { IPageICommunityPlatformProfileFile } from "../../../../../structures/IPageICommunityPlatformProfileFile";

/**
 * Create and attach a new stored media file record for the authenticated member's public profile.
 *
 * This operation supports the profile media workflow described for the community platform's public-facing profile presentation. A profile in this system is the public representation attached to exactly one member account and contains presentation-focused identity data such as the display name and biography, while uploaded avatar-style media is intentionally stored as a supporting resource in the profile file table rather than mixed into the main profile record. By creating a profile file through this endpoint, the member provides the media metadata and resolved storage location needed for the platform to associate the uploaded asset with the member's single profile.
 *
 * Access to this operation is restricted to authenticated members managing their own profile presence. The requirements explicitly allow a signed-in user to upload or replace an avatar image for that user's own profile and require the platform to reject upload attempts for a profile the requester is not allowed to manage. Accordingly, the server must resolve the target profile from the authenticated member identity, verify that exactly one profile exists for that member, and refuse any attempt to use this endpoint as a way to manage another member's public profile media.
 *
 * This operation is backed by the community_platform_profile_files table, which stores atomic file properties for profile-attached media: the business category of the uploaded profile file, the original upload filename, derived extension, MIME content type, file size in bytes, and the access URL from which the file can be retrieved. The parent community_platform_profiles table remains the canonical source for the profile's textual public identity, while this endpoint creates the supporting file record linked to that profile. The one-profile-per-member rule from the profile schema and business rules is central to correct behavior.
 *
 * The intended usage is after the client has already completed the actual file storage step and obtained a stable accessible URI for the uploaded asset. The request to this endpoint should therefore contain metadata for a permitted profile upload purpose, specifically avatar-related profile media. When a new avatar image is attached successfully, the stored media becomes available in profile views, and if the product chooses to treat the latest active avatar as current, downstream read operations for public profile viewing should present the newly attached image. Invalid upload purposes, ownership violations, missing profile records, or malformed file metadata must be rejected according to the profile ownership and file validation rules.
 *
 * @param props.connection
 * @param props.body Profile file creation information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation in the member-authenticated
 *   profile media service layer.
 *
 * 1. Authenticate the requester as a member. Reject guests and unauthenticated callers.
 * 2. Resolve the caller's profile by querying community_platform_profiles where community_platform_member_id equals the authenticated member ID and deleted_at is null. Because the schema enforces @@unique([community_platform_member_id]), expect at most one active profile. If no profile exists, reject the request.
 * 3. Validate that the requested file purpose is allowed for profile media. The business rules allow uploads only for explicitly supported purposes, and for profiles this endpoint must only accept a profile-avatar category value recognized by the application. Reject unsupported categories.
 * 4. Validate the supplied file metadata required to persist community_platform_profile_files: original_name, extension, mime_type, size, and url. Ensure size is a positive integer, url is a non-empty accessible storage location string, and extension / mime_type are internally consistent with the platform's upload policy. The operation should trust only server-approved upload results if upstream file storage signing is used.
 * 5. Create a new community_platform_profile_files record with a generated UUID id, the resolved community_platform_profile_id, validated category, original_name, extension, mime_type, size, url, created_at, and updated_at. Set deleted_at to null.
 * 6. If the business implementation treats avatar replacement as deactivating prior active avatar records, then in the same transaction mark prior profile file records of the avatar category as deleted_at = now() before or after inserting the new record. This uses the schema's deletion timestamp and aligns with the requirement that a newly updated avatar becomes the current profile media shown in views.
 * 7. Return the created profile file entity.
 *
 * Error handling:
 * - Reject when the caller is not an authenticated member.
 * - Reject when no owned profile exists for the authenticated member.
 * - Reject when the category is not permitted for profile uploads.
 * - Reject when file metadata is incomplete, invalid, or inconsistent with upload validation policy.
 * - Reject when the resolved profile is not owned by the authenticated member.
 * - Surface storage-reference validation failures as request errors rather than creating orphaned metadata records.
 *
 * Implementation notes:
 * - Keep profile targeting implicit from authentication context; do not accept profile ownership override from client input.
 * - Use a transaction if replacing previous avatar records so the current-avatar transition is atomic.
 * - Preserve audit timestamps from the schema and ensure downstream profile view queries prefer the latest non-deleted avatar-category file when presenting avatar media.
 * @path /communityPlatform/member/profiles/files
 * @accessor api.functional.communityPlatform.member.profiles.files.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Profile file creation information
     */
    body: ICommunityPlatformProfileFile.ICreate;
  };
  export type Body = ICommunityPlatformProfileFile.ICreate;
  export type Response = ICommunityPlatformProfileFile;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/profiles/files",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/profiles/files";
  export const random = (): ICommunityPlatformProfileFile =>
    typia.random<ICommunityPlatformProfileFile>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a filtered and paginated list of profile file records used to support public profile presentation and profile management workflows.
 *
 * This operation reads from the community_platform_profile_files table, which stores supporting media metadata attached to community_platform_profiles rather than mixing uploaded asset information directly into the main profile record. The returned records describe files associated with a profile, including their business category, original filename, extension, MIME type, size, access URL, and lifecycle timestamps. In the current business scope, profile avatar image is the relevant supported use case for profile media, reflecting the rule that uploaded files are accepted only where the feature explicitly requires them.
 *
 * From a business perspective, this endpoint supports profile maintenance scenarios in which a signed-in member needs to inspect existing profile media associated with their own profile before or after editing display name, bio text, or avatar image. The platform rules require that profile ownership remain tied to exactly one user and that a user may edit only their own profile details. Accordingly, members must only be allowed to browse file records that belong to the profile associated with their own member identity. Administrators may be granted broader read access for oversight purposes if the service authorization policy permits it.
 *
 * This operation is related to public profile viewing and profile editing but does not replace those experiences. Public profile viewing presents the resulting avatar image as part of the user-facing profile page, while profile editing changes the avatar associated with the same owned profile. If a client needs the complete public-facing profile presentation, it should use the profile detail retrieval operation. This endpoint is instead intended for structured metadata retrieval over profile file records, especially when clients need filtering, pagination, or sorting beyond simple public rendering.
 *
 * The operation should exclude logically removed records from normal results unless the request model explicitly supports privileged inclusion of deleted entries for administrative review. If the authenticated user has no owned profile, or if profile ownership cannot be resolved consistently, the request must be rejected in line with the rule that each user has exactly one profile and profile ownership cannot be reassigned by profile-content changes.
 *
 * @param props.connection
 * @param props.body Profile file search criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a paginated search over
 *   community_platform_profile_files joined to community_platform_profiles.
 *
 * For member requests, resolve the authenticated member identity first, then load the single owned community_platform_profiles row through community_platform_member_id. If no profile exists for the authenticated member, reject the request. Constrain the file query to records whose community_platform_profile_id matches that owned profile. For admin requests, allow broader search over profile file records subject to administrative authorization policy.
 *
 * Apply request-body filters from ICommunityPlatformProfileFile.IRequest only to fields that actually exist in the loaded schema, such as category, original_name, extension, mime_type, size, created_at, updated_at, and the parent community_platform_profile_id when administrative use cases require it. Support pagination and deterministic sorting, defaulting to a stable order such as created_at descending with id as a tie-breaker. Exclude rows with deleted_at not null from ordinary results unless the request DTO explicitly includes an administrative option to include deleted records.
 *
 * Project the result into summary DTOs appropriate for list rendering. Include enough metadata for profile media management, such as category, original_name, extension, mime_type, size, url, and timestamps, while avoiding unrelated member authentication data. Return an IPageICommunityPlatformProfileFile.ISummary response with pagination metadata and the filtered data set.
 *
 * Validate authorization before any data retrieval. Reject requests from guests. Reject member attempts to inspect files outside their owned profile scope. Handle missing profile ownership, inaccessible records, and malformed filter values as business errors. No state change occurs in this operation, so it must not create, replace, or remove profile file records.
 * @path /communityPlatform/member/profiles/files
 * @accessor api.functional.communityPlatform.member.profiles.files.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Profile file search criteria and pagination options
     */
    body: ICommunityPlatformProfileFile.IRequest;
  };
  export type Body = ICommunityPlatformProfileFile.IRequest;
  export type Response = IPageICommunityPlatformProfileFile.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/profiles/files",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/profiles/files";
  export const random = (): IPageICommunityPlatformProfileFile.ISummary =>
    typia.random<IPageICommunityPlatformProfileFile.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single public profile file record by its identifier.
 *
 * This operation returns metadata for a stored file attached to a public-facing profile. The underlying community_platform_profile_files table exists to keep uploaded media and file metadata for community_platform_profiles separate from the main profile record, primarily to support optional avatar-style visual identity without mixing binary asset metadata into profile identity fields. The returned resource represents atomic file properties such as category, original filename, extension, MIME type, size, and access URL.
 *
 * The operation is intended for profile presentation scenarios where a client needs the details of one already-known profile file resource, such as an avatar image attachment associated with a member's public presentation. This aligns with the profile domain model, where a profile is the public-facing personal representation attached to one user, and avatar image is one of the three core personal presentation attributes alongside display name and bio text.
 *
 * Access to this operation should follow the same visibility posture as public profile viewing. Requirements state that profile pages are viewable by guests and members while the account exists, and privacy rules limit public visibility to profile and activity elements explicitly defined for the profile page. Because profile files are supporting resources of a publicly viewable profile presentation, this read operation may be exposed to guests, members, and admins, but it must only reveal file metadata that is appropriate for public presentation and must never expose account credentials or unrelated private account data.
 *
 * The implementation must also respect lifecycle validity. Although the file schema contains a deleted_at timestamp for retention-oriented recovery behavior, this endpoint is for active retrieval only. If the file has been removed from active use, if the owning profile is no longer valid for presentation, or if the related user context does not exist, the request must fail rather than returning an inactive or invalid file as if it were publicly available.
 *
 * This operation is commonly used together with profile retrieval endpoints. A client will typically obtain profile context first, then dereference the avatar-related file identifier or URL from profile data when rendering the public profile page. Error handling should distinguish between an unknown file identifier and a file that exists in storage history but is not currently available for active public presentation.
 *
 * @param props.connection
 * @param props.fileId Target profile file's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service method that fetches one
 *   record from community_platform_profile_files by primary key id.
 *
 * Validate that fileId is a UUID-shaped identifier before querying. Query community_platform_profile_files where id equals the provided fileId and deleted_at is null. Join or subsequently verify the owning community_platform_profiles record through community_platform_profile_id, and ensure the owning profile is active enough for public presentation by rejecting records whose profile has deleted_at set. Also verify that the profile remains attached to a valid community_platform_members record through community_platform_member_id, because profile existence is defined as exactly one profile per existing user and requests for a non-existent user must be rejected.
 *
 * Return the file metadata resource using the DTO mapped from the subsidiary file table. Include id, community_platform_profile_id or the DTO's defined profile reference, category, original_name, extension, mime_type, size, url, created_at, and updated_at only insofar as they exist in the generated schema for ICommunityPlatformProfileFile. Do not fabricate derived fields. Do not expose any account credential fields because they are not part of the file entity and are prohibited from public profile exposure.
 *
 * Authorization should allow guest, member, and admin actors because profile viewing is public. No mutation, transaction, or side effect is required. If no active file matches the identifier, return a not-found style error. If the file exists but the owning profile is inactive or invalid for presentation, also reject the request rather than returning stale media metadata. Keep the implementation idempotent and optimized for single-row lookup using the primary key and relation checks.
 * @path /communityPlatform/member/profiles/files/:fileId
 * @accessor api.functional.communityPlatform.member.profiles.files.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target profile file's ID
     */
    fileId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformProfileFile;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/profiles/files/:fileId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/profiles/files/${encodeURIComponent(props.fileId ?? "null")}`;
  export const random = (): ICommunityPlatformProfileFile =>
    typia.random<ICommunityPlatformProfileFile>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("fileId")(() => typia.assert(props.fileId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Replace and update a specific stored profile file record for a member's public profile presentation.
 *
 * This operation updates the file metadata and active asset reference for a profile-owned file stored in the `community_platform_profile_files` table, which exists as a supporting resource for `community_platform_profiles`. The profile file resource is used to keep uploaded media details such as file category, original filename, extension, MIME type, size, and access URL separate from the main profile record. In the profile domain, this separation preserves `community_platform_profiles` as the canonical source of public textual identity fields such as `display_name` and `bio`, while attached profile media remains managed through the related file table.
 *
 * From a business perspective, this endpoint supports the requirement that a signed-in user can edit the avatar image shown on the user's own public profile page. The platform rules further state that when a user updates a profile avatar image, the previous avatar image shown on that profile is replaced. For that reason, this operation should be used only for valid profile-file purposes, especially avatar-style presentation media, and it must not be used to attach unsupported file purposes. Guests must not access this operation, and a member may update only a file that belongs to that member's own profile. Attempts to update a file that belongs to another user's profile must be rejected.
 *
 * The underlying file record stores atomic media metadata rather than authentication or account identity data. The `community_platform_profile_id` relationship ties each file to exactly one profile, and the parent profile itself is uniquely tied to exactly one member through `community_platform_profiles.community_platform_member_id`. That ownership chain is essential to authorization and validation: the implementation must resolve the target file, join to its parent profile, confirm the profile belongs to the authenticated member, and then apply the update without reassigning the file to a different profile or user identity.
 *
 * Validation must ensure that the replacement file information remains appropriate for profile media usage. The platform accepts uploaded files only when the upload is required for a supported feature, including profile avatar image. Therefore, unsupported categories or incompatible file metadata must be rejected. If the target file does not exist, or if its parent profile does not exist, the request must fail. If the file has already been marked deleted through `deleted_at`, the service should treat it as unavailable for normal update processing unless restoration behavior is explicitly implemented elsewhere.
 *
 * This operation is related to profile viewing and profile editing flows. After a successful update, subsequent public profile retrieval operations should reflect the newly active avatar media shown for that profile. Consumers typically use profile viewing APIs to display the updated public presentation after calling this endpoint.
 *
 * @param props.connection
 * @param props.fileId Target profile file record ID
 * @param props.body Replacement information for the profile file
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a profile-file update on
 *   the `community_platform_profile_files` table.
 *
 * 1. Authenticate the caller and require a signed-in member session for normal self-service usage. If administrator override is supported by the service policy, apply equivalent audit handling, but do not bypass existence checks.
 * 2. Load the target `community_platform_profile_files` row by `id = fileId` and ensure `deleted_at IS NULL` for standard update behavior.
 * 3. Join the file row to `community_platform_profiles` using `community_platform_profile_id = community_platform_profiles.id` and verify the parent profile exists.
 * 4. For member callers, verify `community_platform_profiles.community_platform_member_id` matches the authenticated member identity. Reject the request when the file belongs to another member's profile.
 * 5. Validate request body fields against supported profile file use. Permit only profile-related file purpose values that the domain accepts, especially avatar image usage. Reject unsupported purposes because file uploads are allowed only for explicitly supported features.
 * 6. Apply the update to mutable file metadata fields only, such as `category`, `original_name`, `extension`, `mime_type`, `size`, and `url`, according to the request DTO. Do not allow reassignment of `community_platform_profile_id` through this endpoint.
 * 7. Update `updated_at` to the current timestamp. Preserve `created_at`. Do not modify `deleted_at` unless a separate restoration workflow explicitly governs that state.
 * 8. If the platform maintains a single active avatar presentation for the profile, ensure the updated file becomes the effective replacement shown on the profile page according to business rules. If additional consistency handling is required among sibling profile files, perform it in the same transaction.
 * 9. Return the updated `community_platform_profile_files` record as the response payload.
 *
 * Error handling:
 * - Return a not-found error when `fileId` does not match an existing active profile file.
 * - Return a forbidden error when the caller does not own the parent profile.
 * - Return a validation error when the request attempts an unsupported file purpose or invalid file metadata.
 * - Return a conflict or domain validation error when the update would violate service invariants around profile ownership or active avatar replacement.
 * @path /communityPlatform/member/profiles/files/:fileId
 * @accessor api.functional.communityPlatform.member.profiles.files.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target profile file record ID
     */
    fileId: string & tags.Format<"uuid">;

    /**
     * Replacement information for the profile file
     */
    body: ICommunityPlatformProfileFile.IUpdate;
  };
  export type Body = ICommunityPlatformProfileFile.IUpdate;
  export type Response = ICommunityPlatformProfileFile;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/profiles/files/:fileId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/member/profiles/files/${encodeURIComponent(props.fileId ?? "null")}`;
  export const random = (): ICommunityPlatformProfileFile =>
    typia.random<ICommunityPlatformProfileFile>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("fileId")(() => typia.assert(props.fileId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Permanently remove a stored file attached to the authenticated member's public profile.
 *
 * This operation deletes one record from the profile file storage attached to a profile in the community platform. The underlying resource is the `community_platform_profile_files` entity, which stores uploaded media and file metadata for `community_platform_profiles`, including business category, original filename, extension, MIME type, file size, and the resolved storage URL. Because these files exist as supporting resources of a public profile rather than standalone user-managed documents, this endpoint removes the selected profile-owned file by its unique identifier.
 *
 * Access to this operation is limited to the member who owns the profile that the file belongs to. The profile schema defines a strict one-to-one ownership chain: each `community_platform_profiles` record belongs to exactly one `community_platform_members` record, and the business rules require profile ownership to stay tied to the same member identity. The privacy requirements also state that users may edit only their own display name, bio text, and avatar image. Therefore, the service must reject attempts to remove a profile file that is linked to another member's profile, even if the caller knows the file identifier.
 *
 * This operation is directly related to profile presentation management. The profile table is the canonical source for public textual identity such as display name and biography, while optional media such as avatar images are normalized into `community_platform_profile_files`. Removing a file through this endpoint changes the set of media assets available to the member's profile and may affect how the profile is rendered in other profile-viewing operations. Consumers typically use profile retrieval operations before or after this deletion when they need to display the current active avatar or remaining profile file metadata.
 *
 * Validation for this operation focuses on ownership and existence. If the file identifier does not correspond to an existing active record, the request must be rejected. If the file exists but its parent profile does not belong to the authenticated member, the request must be rejected. Successful execution removes the profile file record and should also trigger deletion of the backing stored asset or equivalent storage cleanup workflow so that the accessible file URL is no longer treated as an active profile resource. Error handling should clearly distinguish missing resources from forbidden ownership violations.
 *
 * @param props.connection
 * @param props.fileId Unique identifier of the target profile file record.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a member-authenticated deletion flow for a
 *   single `community_platform_profile_files` record.
 *
 * 1. Authenticate the caller as a member. Guests must be rejected before any resource lookup that would imply edit capability.
 * 2. Load the target file by `community_platform_profile_files.id = :fileId`, and join or follow relations to `community_platform_profiles` and `community_platform_members` so ownership can be verified through `community_platform_profile_files.community_platform_profile_id -> community_platform_profiles.id -> community_platform_profiles.community_platform_member_id`.
 * 3. Reject the request if no matching file exists, or if the matched file is already deleted according to the file record lifecycle policy in the schema.
 * 4. Compare the resolved owning member id with the authenticated member id. If they do not match, reject the request as a forbidden attempt to modify another user's profile asset.
 * 5. Delete the file record and perform associated storage cleanup for the file URL/object referenced by the row. The database change and storage-side cleanup should be coordinated so that successful completion leaves no active profile file metadata pointing at an accessible asset.
 * 6. Update any profile representation logic as needed so subsequent profile reads no longer expose the removed file as an available avatar or profile media item.
 * 7. Return success with no response body.
 *
 * Implementation should account for the fact that `community_platform_profile_files` is a subsidiary resource of `community_platform_profiles`, not an independent business root. Logging should capture actor id, file id, parent profile id, and deletion timestamp for auditability. If physical storage cleanup fails after the row deletion decision point, the service should use a compensating strategy or background retry process so the system does not continue presenting the file as active.
 * @path /communityPlatform/member/profiles/files/:fileId
 * @accessor api.functional.communityPlatform.member.profiles.files.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique identifier of the target profile file record.
     */
    fileId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/profiles/files/:fileId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/profiles/files/${encodeURIComponent(props.fileId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("fileId")(() => typia.assert(props.fileId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
