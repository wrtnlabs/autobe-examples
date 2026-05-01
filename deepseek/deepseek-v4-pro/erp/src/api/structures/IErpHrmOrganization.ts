import { tags } from "typia";

export namespace IErpHrmOrganization {
  /**
   * Summary representation of an organization for the organization selection interface.
   *
   * Provides the essential identity fields needed to display each organization the authenticated member belongs to: the organization's unique identifier, display name, optional description, and optional logo image. Used in the authorization response's organizations array to render the organization selection screen after login or token refresh.
   *
   * Operational settings such as currency, timezone, and fiscal start month are excluded from this summary — they are available through the organization detail endpoint. The description and logo image are nullable; organizations created without a description or logo return null for those fields.
   */
  export type ISummary = {
    /**
     * Unique identifier of the organization.
     *
     * The organization's UUID as stored in erp_hrm_organization_id columns across all organization-scoped entities (employees, departments, projects, roles, etc.). This id is used to select the active organization context and to scope all subsequent API requests for data isolation.
     *
         * @x-autobe-specification Resolved from
         *   erp_hrm_employees.erp_hrm_organization_id. UUID format, always
         *   present — every organization has a unique identifier assigned at
         *   creation. This is the organization UUID stored in the employee
         *   record's organization reference FK column.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the organization.
     *
     * The primary label identifying the organization throughout the platform. Shown in the organization selection interface, header bars, and all organization-scoped views. Must be unique within the platform.
     *
         * @x-autobe-specification Organization display name as defined during
         *   sign-up. Required field — every organization must have a name.
         *   Shown as the primary identifier in the organization selection
         *   screen. Resolved from the organization context through the
         *   employee's organization reference.
     */
    name: string;

    /**
     * Optional free-text description of the organization's purpose or mission.
     *
     * Provides additional context when selecting an organization. May be null when the organization was created without a description.
     *
         * @x-autobe-specification Optional free-text description of the
         *   organization's purpose or mission. Nullable — null when no
         *   description was provided during sign-up or when explicitly cleared
         *   via settings update. Resolved from the organization context through
         *   the employee's organization reference.
     */
    description: string | null;

    /**
     * Optional URI pointing to the organization's logo image.
     *
     * Used for visual identification in the organization selection interface. When set, this image is displayed alongside the organization name. When null, a default placeholder is rendered by the client.
     *
         * @x-autobe-specification Optional URI pointing to the organization's
         *   logo image for visual branding. Nullable — null when no logo was
         *   uploaded during sign-up. When updated via organization settings,
         *   the previously stored logo is replaced. Resolved from the
         *   organization context through the employee's organization reference.
     */
    logo_image: (string & tags.Format<"uri">) | null;
  };
}
